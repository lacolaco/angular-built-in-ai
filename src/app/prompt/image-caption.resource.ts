import {
  DestroyRef,
  effect,
  inject,
  Injector,
  Resource,
  resourceFromSnapshots,
  ResourceSnapshot,
  Signal,
  signal,
} from '@angular/core';
import { LanguageModelFactory } from './language-model-factory';

export interface ImageCaption {
  caption: string;
  mainSubject: string;
  tags: string[];
}

const parseImageCaption = (raw: string): ImageCaption => {
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('LanguageModel response is not a JSON object.');
  }
  const obj = parsed as Partial<ImageCaption>;
  if (
    typeof obj.caption !== 'string' ||
    typeof obj.mainSubject !== 'string' ||
    !Array.isArray(obj.tags) ||
    !obj.tags.every((tag): tag is string => typeof tag === 'string')
  ) {
    throw new Error('LanguageModel response does not match ImageCaption schema.');
  }
  return { caption: obj.caption, mainSubject: obj.mainSubject, tags: obj.tags };
};

export interface ImageCaptionResource extends Resource<ImageCaption | null> {
  readonly languageModelAvailability: Signal<Availability>;
  initialize(): void;
}

const SYSTEM_PROMPT =
  'あなたは画像を日本語で説明するアシスタントです。caption は2〜3文の自然な日本語で記述してください。';

const USER_INSTRUCTION =
  'この画像を日本語で説明してください。caption に説明文、mainSubject に最も主要な被写体、tags に関連する短いタグを返してください。';

const CAPTION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['caption', 'mainSubject', 'tags'],
  additionalProperties: false,
  properties: {
    caption: { type: 'string' },
    mainSubject: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
};

// `availability()` only takes the Core options; passing `initialPrompts`
// (a Create-only field) would be silently dropped — split the two shapes so
// the type system enforces the difference and global-setup probes match.
const LANGUAGE_MODEL_CORE_OPTIONS: LanguageModelCreateCoreOptions = {
  expectedInputs: [
    { type: 'text', languages: ['ja'] },
    { type: 'image' },
  ],
  expectedOutputs: [{ type: 'text', languages: ['ja'] }],
};

const LANGUAGE_MODEL_OPTIONS: LanguageModelCreateOptions = {
  ...LANGUAGE_MODEL_CORE_OPTIONS,
  initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
};

export const imageCaptionResource = (
  source: () => string | null,
  options: { injector?: Injector } = {},
): ImageCaptionResource => {
  const injector = options.injector ?? inject(Injector);
  const destroyRef = injector.get(DestroyRef);
  const factory = injector.get(LanguageModelFactory);

  const state = signal<ResourceSnapshot<ImageCaption | null>>({ status: 'idle', value: null });
  const languageModelAvailability = signal<Availability>('unavailable');

  let initialized = false;

  const initialize = async () => {
    if (initialized) return;
    initialized = true;

    let languageModel: LanguageModel;
    try {
      languageModel = await factory.create(LANGUAGE_MODEL_OPTIONS);
    } catch (e) {
      // Allow the user-driven `initialize()` button to retry after a transient
      // create() failure (download interrupted, quota, permission denied).
      initialized = false;
      state.set({
        status: 'error',
        error: e instanceof Error ? e : new Error(String(e)),
      });
      return;
    }
    languageModelAvailability.set('available');
    destroyRef.onDestroy(() => languageModel.destroy());

    let activeToken = 0;

    effect(
      (onCleanUp) => {
        const src = source();
        if (!src) {
          state.set({ status: 'idle', value: null });
          return;
        }

        const myToken = ++activeToken;
        const abortController = new AbortController();
        onCleanUp(() => abortController.abort());

        const image = new Image();
        image.src = src;

        state.set({ status: 'loading', value: null });

        image
          .decode()
          .then(() => {
            if (myToken !== activeToken) return null;
            return languageModel.prompt(
              [
                {
                  role: 'user',
                  content: [
                    { type: 'text', value: USER_INSTRUCTION },
                    { type: 'image', value: image },
                  ],
                },
              ],
              { responseConstraint: CAPTION_SCHEMA, signal: abortController.signal },
            );
          })
          .then((raw) => {
            if (myToken !== activeToken || raw === null) return;
            state.set({ status: 'resolved', value: parseImageCaption(raw) });
          })
          .catch((error) => {
            if (myToken !== activeToken) return;
            state.set({ status: 'error', error });
          });
      },
      { injector },
    );
  };

  factory
    .availability(LANGUAGE_MODEL_CORE_OPTIONS)
    .then((availability) => {
      if (availability === 'unavailable') {
        initialized = true;
        state.set({ status: 'idle', value: null });
        return;
      }
      languageModelAvailability.set(availability);
      if (availability === 'available' || availability === 'downloading') {
        initialize();
      }
    })
    .catch((error) => {
      initialized = true;
      state.set({ status: 'error', error });
    });

  return {
    ...resourceFromSnapshots(state),
    languageModelAvailability,
    initialize,
  };
};
