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

export interface SummaryResource extends Resource<string> {
  readonly summarizerAvailability: Signal<Availability>;
  initialize(): void;
}

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

    let activeSummarization: Promise<string> | null = null;

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
    console.log('Summarizer availability:', availability);
    if (availability === 'unavailable') {
      // Unsupported environment.
      initialized = true;
      state.set({ status: 'idle', value: '' });
      return;
    }
    summarizerAvailability.set(availability);
    if (availability === 'available' || availability === 'downloading') {
      // no need explicit start.
      initialize();
    }
  });

  return {
    ...resourceFromSnapshots(state),
    summarizerAvailability: summarizerAvailability,
    initialize,
  };
};
