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
import { SummarizerFactory } from './summarizer-factory';

/**
 * {@link summaryResource} が返す Resource。
 * 標準の `Resource<string>` に Summarizer 固有のプロパティを加えたもの。
 */
export interface SummaryResource extends Resource<string> {
  /** Summarizer の利用可否。`Summarizer.availability()` の戻り値を反映する。 */
  readonly summarizerAvailability: Signal<Availability>;

  /**
   * Summarizer を生成して要約を開始する。冪等。
   * `summarizerAvailability()` が `'downloadable'` のときはユーザー操作起点（クリック等）で呼ぶ必要がある。
   */
  initialize(): void;
}

/**
 * source signal の値を Built-in AI Summarizer で要約するリアクティブな Resource を生成する。
 *
 * - `summarizerAvailability()` が `'available'` / `'downloading'` の場合は自動で初期化される。
 * - `'downloadable'` のときはユーザー操作内で {@link SummaryResource.initialize} を呼ぶ必要がある。
 * - 初期化後は source の変化に応じて要約が再実行される。空文字・空白は idle 扱い。
 * - source が連続変化した場合、古い要約は AbortController で中断され、最新の結果のみが反映される。
 *
 * @param source 要約対象の文字列を返す reactive な関数。デバウンスは呼び出し側で行うこと。
 * @param options.summarizerOptions `Summarizer.create()` / `availability()` に渡すオプション。
 * @param options.injector 省略時は `inject(Injector)` で取得する（injection context が必要）。
 *
 * @example
 * ```ts
 * protected readonly input = signal('');
 * protected readonly summary = summaryResource(this.input, {
 *   summarizerOptions: { type: 'key-points', outputLanguage: 'ja' },
 * });
 * ```
 */
export const summaryResource = (
  source: () => string,
  options: {
    summarizerOptions?: SummarizerCreateOptions;
    injector?: Injector;
  } = {},
): SummaryResource => {
  const injector = options.injector ?? inject(Injector);
  const destroyRef = injector.get(DestroyRef);
  const factory = injector.get(SummarizerFactory);
  const summarizerOptions = options.summarizerOptions;

  const state = signal<ResourceSnapshot<string>>({ status: 'idle', value: '' });
  const summarizerAvailability = signal<Availability>('unavailable');

  let initialized = false;
  let activeSummarization: Promise<string> | null = null;

  const initialize = async () => {
    if (initialized) {
      return;
    }
    initialized = true;

    const summarizer = await factory.create(summarizerOptions);
    summarizerAvailability.set('available');
    destroyRef.onDestroy(() => {
      summarizer.destroy();
    });

    effect(
      (onCleanUp) => {
        const input = source();
        if (!input.trim()) {
          state.set({ status: 'idle', value: '' });
          return;
        }

        const abortController = new AbortController();
        onCleanUp(() => {
          abortController.abort();
        });

        const summarizePromise = summarizer.summarize(input, { signal: abortController.signal });
        activeSummarization = summarizePromise;

        state.set({ status: 'loading', value: '' });
        summarizePromise
          .then((result) => {
            // 古い summarize の結果で新しい状態を上書きしないよう、最新の Promise のみ反映する。
            if (activeSummarization === summarizePromise) {
              state.set({ status: 'resolved', value: result });
            }
          })
          .catch((error) => {
            if (activeSummarization === summarizePromise) {
              state.set({ status: 'error', error });
            }
          });
      },
      { injector },
    );
  };

  factory.availability(summarizerOptions).then((availability) => {
    if (availability === 'unavailable') {
      initialized = true;
      state.set({ status: 'idle', value: '' });
      return;
    }
    summarizerAvailability.set(availability);
    if (availability === 'available' || availability === 'downloading') {
      initialize();
    }
  });

  return {
    ...resourceFromSnapshots(state),
    summarizerAvailability: summarizerAvailability,
    initialize,
  };
};
