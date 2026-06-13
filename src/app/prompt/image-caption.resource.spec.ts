import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageCaptionResource } from './image-caption.resource';
import { LanguageModelFactory } from './language-model-factory';

beforeEach(() => {
  class ImageMock {
    src = '';
    decode = vi.fn(async () => undefined);
  }
  vi.stubGlobal('Image', ImageMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setupFactory(prompt?: (input: unknown) => Promise<string>) {
  const promptFn = vi.fn(
    prompt ??
      (async () =>
        JSON.stringify({ caption: '猫の写真', mainSubject: '猫', tags: ['動物', '猫'] })),
  );
  const languageModel = {
    prompt: promptFn,
    destroy: vi.fn(),
  } as unknown as LanguageModel;

  const factory = {
    availability: vi.fn(async (): Promise<Availability> => 'available'),
    create: vi.fn(async () => languageModel),
  };

  TestBed.configureTestingModule({
    providers: [{ provide: LanguageModelFactory, useValue: factory }],
  });

  return { factory, languageModel, promptFn };
}

describe('imageCaptionResource', () => {
  it('availability="available" のとき自動初期化され、src がセットされると prompt して resolved になる', async () => {
    const { factory, promptFn } = setupFactory();
    const source = signal<string | null>(null);
    const injector = TestBed.inject(Injector);

    const resource = imageCaptionResource(source, { injector });

    await vi.waitFor(() => {
      expect(resource.languageModelAvailability()).toBe('available');
    });
    expect(factory.create).toHaveBeenCalledTimes(1);

    source.set('samples/a.jpg');
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.status()).toBe('resolved');
    });
    expect(resource.value()).toEqual({
      caption: '猫の写真',
      mainSubject: '猫',
      tags: ['動物', '猫'],
    });
    expect(promptFn).toHaveBeenCalledTimes(1);
  });

  it('source が null のとき prompt を呼ばない', async () => {
    const { promptFn } = setupFactory();
    const source = signal<string | null>(null);
    const injector = TestBed.inject(Injector);

    const resource = imageCaptionResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.languageModelAvailability()).toBe('available');
    });

    expect(resource.status()).toBe('idle');
    expect(promptFn).not.toHaveBeenCalled();
  });

  it('src 変更ごとに prompt を再呼び出しする', async () => {
    const { promptFn } = setupFactory(async () =>
      JSON.stringify({ caption: 'A', mainSubject: 'a', tags: [] }),
    );
    const source = signal<string | null>(null);
    const injector = TestBed.inject(Injector);

    const resource = imageCaptionResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.languageModelAvailability()).toBe('available');
    });

    source.set('samples/a.jpg');
    TestBed.tick();
    await vi.waitFor(() => expect(resource.status()).toBe('resolved'));

    source.set('samples/b.jpg');
    TestBed.tick();
    await vi.waitFor(() => expect(promptFn).toHaveBeenCalledTimes(2));
  });

  it('prompt 失敗時は error 状態になる', async () => {
    const failure = new Error('prompt failed');
    setupFactory(async () => {
      throw failure;
    });
    const source = signal<string | null>(null);
    const injector = TestBed.inject(Injector);

    const resource = imageCaptionResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.languageModelAvailability()).toBe('available');
    });

    source.set('samples/a.jpg');
    TestBed.tick();
    await vi.waitFor(() => expect(resource.status()).toBe('error'));
    expect(resource.error()).toBe(failure);
  });

  it('レスポンスが不正な JSON のとき error 状態になる', async () => {
    setupFactory(async () => 'not-json');
    const source = signal<string | null>(null);
    const injector = TestBed.inject(Injector);

    const resource = imageCaptionResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.languageModelAvailability()).toBe('available');
    });

    source.set('samples/a.jpg');
    TestBed.tick();
    await vi.waitFor(() => expect(resource.status()).toBe('error'));
    expect(resource.error()).toBeInstanceOf(Error);
  });

  it('availability="downloadable" のとき自動初期化されず、initialize() で開始する', async () => {
    const { factory } = setupFactory();
    factory.availability.mockResolvedValue('downloadable');
    const source = signal<string | null>('samples/a.jpg');
    const injector = TestBed.inject(Injector);

    const resource = imageCaptionResource(source, { injector });
    await vi.waitFor(() => {
      expect(resource.languageModelAvailability()).toBe('downloadable');
    });
    expect(factory.create).not.toHaveBeenCalled();

    resource.initialize();
    TestBed.tick();
    await vi.waitFor(() => expect(resource.status()).toBe('resolved'));
    expect(factory.create).toHaveBeenCalledTimes(1);
  });

  it('availability="unavailable" のとき create も prompt も呼ばれない', async () => {
    const { factory, promptFn } = setupFactory();
    factory.availability.mockResolvedValue('unavailable');
    const source = signal<string | null>('samples/a.jpg');
    const injector = TestBed.inject(Injector);

    const resource = imageCaptionResource(source, { injector });

    await vi.waitFor(() => expect(factory.availability).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));

    expect(resource.status()).toBe('idle');
    expect(promptFn).not.toHaveBeenCalled();
    expect(factory.create).not.toHaveBeenCalled();

    resource.initialize();
    await new Promise((r) => setTimeout(r, 0));
    expect(factory.create).not.toHaveBeenCalled();
  });
});
