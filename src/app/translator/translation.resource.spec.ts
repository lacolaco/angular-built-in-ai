import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { translationResource } from './translation.resource';
import { TranslatorFactory } from './translator-factory';

function setupFactory(translate?: (text: string) => Promise<string>) {
  const translateFn = vi.fn(translate ?? (async (t: string) => `[en->ja]${t}`));
  const destroyFn = vi.fn();
  const translator = {
    translate: translateFn,
    destroy: destroyFn,
  } as unknown as Translator;

  const factory = {
    availability: vi.fn(async (): Promise<Availability> => 'available'),
    create: vi.fn(async () => translator),
  };

  TestBed.configureTestingModule({
    providers: [{ provide: TranslatorFactory, useValue: factory }],
  });

  return { factory, translator, translateFn, destroyFn };
}

const enToJa: TranslatorCreateOptions = { sourceLanguage: 'en', targetLanguage: 'ja' };
const jaToEn: TranslatorCreateOptions = { sourceLanguage: 'ja', targetLanguage: 'en' };

describe('translationResource', () => {
  it('availability="available" のとき自動初期化され、source 変化で translate する', async () => {
    const { factory, translateFn } = setupFactory();
    const text = signal('');
    const opts = signal(enToJa);
    const injector = TestBed.inject(Injector);

    const resource = translationResource(text, opts, { injector });

    await vi.waitFor(() => {
      expect(resource.translatorAvailability()).toBe('available');
    });
    expect(factory.create).toHaveBeenCalledTimes(1);

    text.set('hello');
    TestBed.tick();
    await vi.waitFor(() => {
      expect(resource.status()).toBe('resolved');
    });
    expect(resource.value()).toBe('[en->ja]hello');
    expect(translateFn).toHaveBeenCalledExactlyOnceWith('hello', expect.anything());
  });

  it('source が空白の間は translate を呼ばない', async () => {
    const { translateFn } = setupFactory();
    const text = signal('');
    const opts = signal(enToJa);
    const injector = TestBed.inject(Injector);

    const resource = translationResource(text, opts, { injector });
    await vi.waitFor(() => {
      expect(resource.translatorAvailability()).toBe('available');
    });

    text.set('   ');
    TestBed.tick();
    expect(resource.status()).toBe('idle');
    expect(translateFn).not.toHaveBeenCalled();
  });

  it('source signal の変更ごとに translate を再呼び出しする', async () => {
    const { translateFn } = setupFactory(async (t: string) => `[t]${t}`);
    const text = signal('');
    const opts = signal(enToJa);
    const injector = TestBed.inject(Injector);

    const resource = translationResource(text, opts, { injector });
    await vi.waitFor(() => {
      expect(resource.translatorAvailability()).toBe('available');
    });

    text.set('first');
    TestBed.tick();
    await vi.waitFor(() => expect(resource.value()).toBe('[t]first'));

    text.set('second');
    TestBed.tick();
    await vi.waitFor(() => expect(resource.value()).toBe('[t]second'));

    expect(translateFn).toHaveBeenCalledTimes(2);
  });

  it('translatorOptions が変わると Translator を再作成して source を翻訳しなおす', async () => {
    const { factory, destroyFn, translateFn } = setupFactory(
      async (t: string) => `[xlate]${t}`,
    );
    const text = signal('hello');
    const opts = signal(enToJa);
    const injector = TestBed.inject(Injector);

    const resource = translationResource(text, opts, { injector });

    await vi.waitFor(() => expect(resource.value()).toBe('[xlate]hello'));
    expect(factory.create).toHaveBeenCalledTimes(1);
    expect(factory.create).toHaveBeenLastCalledWith(enToJa);

    opts.set(jaToEn);
    TestBed.tick();

    await vi.waitFor(() => expect(factory.create).toHaveBeenCalledTimes(2));
    expect(factory.create).toHaveBeenLastCalledWith(jaToEn);
    expect(destroyFn).toHaveBeenCalledTimes(1);
    // Source should be re-translated under the new direction.
    await vi.waitFor(() => expect(translateFn).toHaveBeenCalledTimes(2));
  });

  it('translate 失敗時は error 状態になる', async () => {
    const failure = new Error('translate failed');
    setupFactory(async () => {
      throw failure;
    });
    const text = signal('');
    const opts = signal(enToJa);
    const injector = TestBed.inject(Injector);

    const resource = translationResource(text, opts, { injector });
    await vi.waitFor(() => {
      expect(resource.translatorAvailability()).toBe('available');
    });

    text.set('boom');
    TestBed.tick();
    await vi.waitFor(() => expect(resource.status()).toBe('error'));
    expect(resource.error()).toBe(failure);
  });

  it('availability="downloadable" のとき自動初期化されず、initialize() で開始する', async () => {
    const { factory } = setupFactory(async (t: string) => `[t]${t}`);
    factory.availability.mockResolvedValue('downloadable');
    const text = signal('hello');
    const opts = signal(enToJa);
    const injector = TestBed.inject(Injector);

    const resource = translationResource(text, opts, { injector });
    await vi.waitFor(() => {
      expect(resource.translatorAvailability()).toBe('downloadable');
    });
    expect(factory.create).not.toHaveBeenCalled();

    resource.initialize();
    TestBed.tick();
    await vi.waitFor(() => expect(resource.value()).toBe('[t]hello'));
    expect(factory.create).toHaveBeenCalledTimes(1);
  });

  it('sourceLanguage === targetLanguage のとき availability probe を呼ばずに unavailable で idle になる', async () => {
    const { factory } = setupFactory();
    const text = signal('hello');
    const opts = signal<TranslatorCreateOptions>({ sourceLanguage: 'ja', targetLanguage: 'ja' });
    const injector = TestBed.inject(Injector);

    const resource = translationResource(text, opts, { injector });

    await new Promise((r) => setTimeout(r, 0));
    expect(resource.translatorAvailability()).toBe('unavailable');
    expect(resource.status()).toBe('idle');
    expect(factory.availability).not.toHaveBeenCalled();
    expect(factory.create).not.toHaveBeenCalled();
  });

  it('create() が downloadable 経由で失敗したら error 状態にしつつ availability を downloadable に戻す', async () => {
    const failure = new Error('create failed');
    const { factory } = setupFactory();
    factory.availability.mockResolvedValue('downloadable');
    factory.create.mockRejectedValue(failure);
    const text = signal('hello');
    const opts = signal(enToJa);
    const injector = TestBed.inject(Injector);

    const resource = translationResource(text, opts, { injector });
    await vi.waitFor(() => {
      expect(resource.translatorAvailability()).toBe('downloadable');
    });

    resource.initialize();
    await vi.waitFor(() => expect(resource.status()).toBe('error'));
    expect(resource.error()).toBe(failure);
    // The retry affordance must come back so the user can click again.
    expect(resource.translatorAvailability()).toBe('downloadable');
  });

  it('availability="unavailable" のとき create も translate も呼ばれない', async () => {
    const { factory, translateFn } = setupFactory();
    factory.availability.mockResolvedValue('unavailable');
    const text = signal('hello');
    const opts = signal(enToJa);
    const injector = TestBed.inject(Injector);

    const resource = translationResource(text, opts, { injector });

    await vi.waitFor(() => expect(factory.availability).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));

    expect(resource.status()).toBe('idle');
    expect(translateFn).not.toHaveBeenCalled();
    expect(factory.create).not.toHaveBeenCalled();

    resource.initialize();
    await new Promise((r) => setTimeout(r, 0));
    expect(factory.create).not.toHaveBeenCalled();
  });
});
