import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { languageDetectionResource } from './language-detection.resource';
import { LanguageDetectorFactory } from './language-detector-factory';

function setupFactory(detect?: (input: string) => Promise<LanguageDetectionResult[]>) {
  const detectFn = vi.fn(
    detect ?? (async (input: string) => [{ detectedLanguage: 'en', confidence: 0.99 }]),
  );
  const detector = {
    detect: detectFn,
    destroy: vi.fn(),
  } as unknown as LanguageDetector;

  const factory = {
    availability: vi.fn(async (): Promise<Availability> => 'available'),
    create: vi.fn(async () => detector),
  };

  TestBed.configureTestingModule({
    providers: [{ provide: LanguageDetectorFactory, useValue: factory }],
  });

  return { factory, detector, detectFn };
}

describe('languageDetectionResource', () => {
  it('availability="available" のとき自動初期化され、source 変化で detect する', async () => {
    const { factory, detectFn } = setupFactory();
    const source = signal('');
    const injector = TestBed.inject(Injector);

    const resource = languageDetectionResource(source, { injector });

    await vi.waitFor(() => {
      expect(resource.detectorAvailability()).toBe('available');
    });
    expect(factory.create).toHaveBeenCalledTimes(1);

    source.set('Hello world');
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.status()).toBe('resolved');
    });
    expect(resource.value()).toEqual([{ detectedLanguage: 'en', confidence: 0.99 }]);
    expect(detectFn).toHaveBeenCalledExactlyOnceWith('Hello world', expect.anything());
  });

  it('source が空白の間は detect を呼ばない', async () => {
    const { detectFn } = setupFactory();
    const source = signal('');
    const injector = TestBed.inject(Injector);

    const resource = languageDetectionResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.detectorAvailability()).toBe('available');
    });

    source.set('   ');
    TestBed.tick();
    expect(resource.status()).toBe('idle');
    expect(detectFn).not.toHaveBeenCalled();
  });

  it('source signal の変更ごとに detect を再呼び出しする', async () => {
    let i = 0;
    const { detectFn } = setupFactory(async () => [
      { detectedLanguage: `lang${++i}`, confidence: 1 },
    ]);
    const source = signal('');
    const injector = TestBed.inject(Injector);

    const resource = languageDetectionResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.detectorAvailability()).toBe('available');
    });

    source.set('first');
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.value()).toEqual([{ detectedLanguage: 'lang1', confidence: 1 }]);
    });

    source.set('second');
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.value()).toEqual([{ detectedLanguage: 'lang2', confidence: 1 }]);
    });

    expect(detectFn).toHaveBeenCalledTimes(2);
    expect(detectFn).toHaveBeenNthCalledWith(1, 'first', expect.anything());
    expect(detectFn).toHaveBeenNthCalledWith(2, 'second', expect.anything());
  });

  it('detect 失敗時は error 状態になる', async () => {
    const failure = new Error('detect failed');
    setupFactory(async () => {
      throw failure;
    });
    const source = signal('');
    const injector = TestBed.inject(Injector);

    const resource = languageDetectionResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.detectorAvailability()).toBe('available');
    });

    source.set('boom');
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.status()).toBe('error');
    });
    expect(resource.error()).toBe(failure);
  });

  it('availability="downloadable" のとき自動初期化されず、initialize() で開始する', async () => {
    const { factory } = setupFactory();
    factory.availability.mockResolvedValue('downloadable');
    const source = signal('hello');
    const injector = TestBed.inject(Injector);

    const resource = languageDetectionResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.detectorAvailability()).toBe('downloadable');
    });
    expect(factory.create).not.toHaveBeenCalled();

    resource.initialize();
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.status()).toBe('resolved');
    });
    expect(factory.create).toHaveBeenCalledTimes(1);
  });

  it('availability="unavailable" のとき create も detect も呼ばれない', async () => {
    const { factory, detectFn } = setupFactory();
    factory.availability.mockResolvedValue('unavailable');
    const source = signal('hello');
    const injector = TestBed.inject(Injector);

    const resource = languageDetectionResource(source, { injector });

    await vi.waitFor(() => {
      expect(factory.availability).toHaveBeenCalled();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(resource.status()).toBe('idle');
    expect(detectFn).not.toHaveBeenCalled();
    expect(factory.create).not.toHaveBeenCalled();

    resource.initialize();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(factory.create).not.toHaveBeenCalled();
  });

  it('detect の戻り値が空配列のときも resolved として空配列を返す', async () => {
    setupFactory(async () => []);
    const source = signal('hello');
    const injector = TestBed.inject(Injector);

    const resource = languageDetectionResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.detectorAvailability()).toBe('available');
    });

    await vi.waitFor(() => {
      expect(resource.status()).toBe('resolved');
    });
    expect(resource.value()).toEqual([]);
  });
});
