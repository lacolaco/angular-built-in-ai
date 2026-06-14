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
  untracked,
} from '@angular/core';
import { TranslatorFactory } from './translator-factory';

/**
 * {@link translationResource} が返す Resource。標準の `Resource<string>` に
 * Translator 固有のプロパティを加えたもの。
 */
export interface TranslationResource extends Resource<string> {
  /** Translator の利用可否。`Translator.availability()` の戻り値を反映する。 */
  readonly translatorAvailability: Signal<Availability>;

  /**
   * Translator を生成して翻訳を開始する。冪等。
   * `translatorAvailability()` が `'downloadable'` のときはユーザー操作起点で呼ぶ必要がある。
   */
  initialize(): void;
}

const optsKey = (o: TranslatorCreateOptions) => `${o.sourceLanguage}|${o.targetLanguage}`;

/**
 * source signal の値を `translatorOptions` が指す方向で翻訳するリアクティブな Resource を生成する。
 *
 * - `translatorAvailability()` が `'available'` / `'downloading'` の場合は自動で初期化される。
 * - `'downloadable'` のときはユーザー操作内で {@link TranslationResource.initialize} を呼ぶ必要がある。
 * - source の変化に応じて翻訳が再実行される。空文字・空白は idle 扱い。
 * - `translatorOptions()` の値（言語ペア）が変わった場合、現在の Translator は destroy され、
 *   新しいペア用の Translator が作り直されて source を再翻訳する。
 */
export const translationResource = (
  source: () => string,
  translatorOptions: () => TranslatorCreateOptions,
  options: { injector?: Injector } = {},
): TranslationResource => {
  const injector = options.injector ?? inject(Injector);
  const destroyRef = injector.get(DestroyRef);
  const factory = injector.get(TranslatorFactory);

  const state = signal<ResourceSnapshot<string>>({ status: 'idle', value: '' });
  const translatorAvailability = signal<Availability>('unavailable');
  // Set whenever a Translator has been created for the current options pair.
  // Reading it inside the translate effect ties translation re-runs to
  // translator lifecycle changes.
  const translator = signal<Translator | null>(null);

  let initializedKey: string | null = null;

  const teardown = () => {
    const t = untracked(translator);
    if (t) {
      t.destroy();
      translator.set(null);
    }
  };
  destroyRef.onDestroy(teardown);

  const initializeFor = async (opts: TranslatorCreateOptions) => {
    const key = optsKey(opts);
    if (initializedKey === key) return;
    initializedKey = key;

    teardown();
    // Surface the "create is in flight" state immediately so the page can
    // swap the "Initialize" button for a "Downloading…" indicator and the
    // user can't issue a duplicate user-gesture create.
    translatorAvailability.set('downloading');

    let t: Translator;
    try {
      t = await factory.create(opts);
    } catch (e) {
      initializedKey = null;
      state.set({
        status: 'error',
        error: e instanceof Error ? e : new Error(String(e)),
      });
      return;
    }
    if (initializedKey !== key) {
      // A newer pair has been initialized while we awaited create(). Drop this one.
      t.destroy();
      return;
    }
    translator.set(t);
    translatorAvailability.set('available');
  };

  const initialize = () => {
    void initializeFor(untracked(translatorOptions));
  };

  // Effect 1: react to translatorOptions changes by re-probing availability
  // and auto-initialising when possible.
  effect(
    () => {
      const opts = translatorOptions();
      // Reset prior translator immediately when the pair changes, so the
      // translate effect can't keep emitting against the old direction.
      const previousKey = initializedKey;
      const nextKey = optsKey(opts);
      if (previousKey !== null && previousKey !== nextKey) {
        teardown();
        initializedKey = null;
      }

      factory
        .availability(opts)
        .then((availability) => {
          // Stale guard: another effect run may have superseded us.
          if (optsKey(untracked(translatorOptions)) !== nextKey) return;
          translatorAvailability.set(availability);
          if (availability === 'unavailable') {
            initializedKey = nextKey; // mark as resolved so initialize() is a no-op
            state.set({ status: 'idle', value: '' });
            return;
          }
          if (availability === 'available' || availability === 'downloading') {
            void initializeFor(opts);
          }
          // 'downloadable' waits for initialize().
        })
        .catch((error) => {
          if (optsKey(untracked(translatorOptions)) !== nextKey) return;
          initializedKey = nextKey;
          state.set({ status: 'error', error });
        });
    },
    { injector },
  );

  // Effect 2: react to source / translator readiness changes and run translate.
  effect(
    (onCleanUp) => {
      const t = translator();
      const input = source();

      if (!t) {
        // Translator not ready yet — leave whatever state initialize set.
        return;
      }
      if (!input.trim()) {
        state.set({ status: 'idle', value: '' });
        return;
      }

      const abortController = new AbortController();
      onCleanUp(() => abortController.abort());

      const promise = t.translate(input, { signal: abortController.signal });
      state.set({ status: 'loading', value: '' });

      promise
        .then((result) => {
          if (abortController.signal.aborted) return;
          state.set({ status: 'resolved', value: result });
        })
        .catch((error) => {
          if (abortController.signal.aborted) return;
          state.set({ status: 'error', error });
        });
    },
    { injector },
  );

  return {
    ...resourceFromSnapshots(state),
    translatorAvailability,
    initialize,
  };
};
