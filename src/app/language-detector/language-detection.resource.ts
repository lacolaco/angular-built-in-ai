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
import { LanguageDetectorFactory } from './language-detector-factory';

export interface LanguageDetectionResource extends Resource<LanguageDetectionResult[]> {
  readonly detectorAvailability: Signal<Availability>;
  initialize(): void;
}

export const languageDetectionResource = (
  source: () => string,
  options: {
    detectorOptions?: LanguageDetectorCreateOptions;
    injector?: Injector;
  } = {},
): LanguageDetectionResource => {
  const injector = options.injector ?? inject(Injector);
  const destroyRef = injector.get(DestroyRef);
  const factory = injector.get(LanguageDetectorFactory);
  const detectorOptions = options.detectorOptions;

  const state = signal<ResourceSnapshot<LanguageDetectionResult[]>>({
    status: 'idle',
    value: [],
  });
  const detectorAvailability = signal<Availability>('unavailable');

  let initialized = false;

  const initialize = async () => {
    if (initialized) {
      return;
    }
    initialized = true;

    let detector: LanguageDetector;
    try {
      detector = await factory.create(detectorOptions);
    } catch (e) {
      initialized = false;
      state.set({
        status: 'error',
        error: e instanceof Error ? e : new Error(String(e)),
      });
      return;
    }
    detectorAvailability.set('available');
    destroyRef.onDestroy(() => {
      detector.destroy();
    });

    let activeDetection: Promise<LanguageDetectionResult[]> | null = null;

    effect(
      (onCleanUp) => {
        const input = source();
        if (!input.trim()) {
          state.set({ status: 'idle', value: [] });
          return;
        }

        const abortController = new AbortController();
        onCleanUp(() => {
          abortController.abort();
        });

        const detectPromise = detector.detect(input, { signal: abortController.signal });
        activeDetection = detectPromise;

        state.set({ status: 'loading', value: [] });
        detectPromise
          .then((result) => {
            if (activeDetection === detectPromise) {
              state.set({ status: 'resolved', value: result });
            }
          })
          .catch((error) => {
            if (activeDetection === detectPromise) {
              state.set({ status: 'error', error });
            }
          });
      },
      { injector },
    );
  };

  factory
    .availability(detectorOptions)
    .then((availability) => {
      if (availability === 'unavailable') {
        initialized = true;
        state.set({ status: 'idle', value: [] });
        return;
      }
      detectorAvailability.set(availability);
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
    detectorAvailability,
    initialize,
  };
};
