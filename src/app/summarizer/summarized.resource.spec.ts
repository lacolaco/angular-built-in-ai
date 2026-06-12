import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { summaryResource } from './summarized.resource';
import { SummarizerFactory } from './summarizer-factory';

function setupFactory(summarize?: (source: string) => Promise<string>) {
  const summarizeFn = vi.fn(summarize ?? (async (s: string) => `[summary]${s}`));
  const summarizer = {
    summarize: summarizeFn,
    destroy: vi.fn(),
  } as unknown as Summarizer;

  const factory = {
    availability: vi.fn(async (): Promise<Availability> => 'available'),
    create: vi.fn(async () => summarizer),
  };

  TestBed.configureTestingModule({
    providers: [{ provide: SummarizerFactory, useValue: factory }],
  });

  return { factory, summarizer, summarizeFn };
}

describe('summaryResource', () => {
  it('availability="available" のとき自動初期化され、source 変化で要約する', async () => {
    const { factory, summarizeFn } = setupFactory();
    const source = signal('');
    const injector = TestBed.inject(Injector);

    const resource = summaryResource(source, { injector });

    await vi.waitFor(() => {
      expect(resource.summarizerAvailability()).toBe('available');
    });
    expect(factory.create).toHaveBeenCalledTimes(1);

    source.set('hello');
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.status()).toBe('resolved');
    });
    expect(resource.value()).toBe('[summary]hello');
    expect(summarizeFn).toHaveBeenCalledExactlyOnceWith('hello', expect.anything());
  });

  it('source が空白の間は summarize を呼ばない', async () => {
    const { summarizeFn } = setupFactory();
    const source = signal('');
    const injector = TestBed.inject(Injector);

    const resource = summaryResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.summarizerAvailability()).toBe('available');
    });

    source.set('   ');
    TestBed.tick();
    expect(resource.status()).toBe('idle');
    expect(summarizeFn).not.toHaveBeenCalled();
  });

  it('source signal の変更ごとに summarize を再呼び出しする', async () => {
    const { summarizeFn } = setupFactory();
    const source = signal('');
    const injector = TestBed.inject(Injector);

    const resource = summaryResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.summarizerAvailability()).toBe('available');
    });

    source.set('first');
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.value()).toBe('[summary]first');
    });

    source.set('second');
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.value()).toBe('[summary]second');
    });

    expect(summarizeFn).toHaveBeenCalledTimes(2);
    expect(summarizeFn).toHaveBeenNthCalledWith(1, 'first', expect.anything());
    expect(summarizeFn).toHaveBeenNthCalledWith(2, 'second', expect.anything());
  });

  it('summarize 失敗時は error 状態になる', async () => {
    const failure = new Error('summarize failed');
    setupFactory(async () => {
      throw failure;
    });
    const source = signal('');
    const injector = TestBed.inject(Injector);

    const resource = summaryResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.summarizerAvailability()).toBe('available');
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

    const resource = summaryResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.summarizerAvailability()).toBe('downloadable');
    });
    expect(factory.create).not.toHaveBeenCalled();

    resource.initialize();
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.value()).toBe('[summary]hello');
    });
    expect(factory.create).toHaveBeenCalledTimes(1);
  });

  it('availability="unavailable" のとき create も summarize も呼ばれない', async () => {
    const { factory, summarizeFn } = setupFactory();
    factory.availability.mockResolvedValue('unavailable');
    const source = signal('hello');
    const injector = TestBed.inject(Injector);

    const resource = summaryResource(source, { injector });

    // Wait for the availability promise to resolve.
    await vi.waitFor(() => {
      expect(factory.availability).toHaveBeenCalled();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(resource.status()).toBe('idle');
    expect(summarizeFn).not.toHaveBeenCalled();
    expect(factory.create).not.toHaveBeenCalled();

    // initialize() must be a no-op once marked initialized.
    resource.initialize();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(factory.create).not.toHaveBeenCalled();
  });
});
