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

const LANGUAGE_MODEL_OPTIONS: LanguageModelCreateOptions = {
  expectedInputs: [
    { type: 'text', languages: ['ja'] },
    { type: 'image' },
  ],
  expectedOutputs: [{ type: 'text', languages: ['ja'] }],
  initialPrompts: [{ role: 'system', content: SYSTEM_PROMPT }],
};

export const imageCaptionResource = (
  source: () => HTMLImageElement | null,
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

    const languageModel = await factory.create(LANGUAGE_MODEL_OPTIONS);
    languageModelAvailability.set('available');
    destroyRef.onDestroy(() => languageModel.destroy());

    let activeImage: HTMLImageElement | null = null;

    effect(
      (onCleanUp) => {
        const image = source();
        if (!image) {
          state.set({ status: 'idle', value: null });
          return;
        }

        const abortController = new AbortController();
        onCleanUp(() => abortController.abort());
        activeImage = image;

        state.set({ status: 'loading', value: null });

        image
          .decode()
          .then(() => {
            if (activeImage !== image) return null;
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
            if (activeImage !== image || raw === null) return;
            state.set({ status: 'resolved', value: JSON.parse(raw) as ImageCaption });
          })
          .catch((error) => {
            if (activeImage !== image) return;
            state.set({ status: 'error', error });
          });
      },
      { injector },
    );
  };

  factory.availability(LANGUAGE_MODEL_OPTIONS).then((availability) => {
    if (availability === 'unavailable') {
      initialized = true;
      state.set({ status: 'idle', value: null });
      return;
    }
    languageModelAvailability.set(availability);
    if (availability === 'available' || availability === 'downloading') {
      initialize();
    }
  });

  return {
    ...resourceFromSnapshots(state),
    languageModelAvailability,
    initialize,
  };
};
