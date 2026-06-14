import { Injectable } from '@angular/core';
import {
  createBuiltinAITranslator,
  getBuiltinAITranslatorAvailability,
  isTranslationSupported,
} from '../ai/translator';

@Injectable({
  providedIn: 'root',
  useFactory: () =>
    isTranslationSupported ? new BuiltinAITranslatorFactory() : new NoopTranslatorFactory(),
})
export abstract class TranslatorFactory {
  abstract availability(options: TranslatorCreateCoreOptions): Promise<Availability>;
  abstract create(options: TranslatorCreateOptions): Promise<Translator>;
}

@Injectable()
export class BuiltinAITranslatorFactory extends TranslatorFactory {
  override availability(options: TranslatorCreateCoreOptions): Promise<Availability> {
    return getBuiltinAITranslatorAvailability(options);
  }

  override create(options: TranslatorCreateOptions): Promise<Translator> {
    return createBuiltinAITranslator(options);
  }
}

@Injectable()
export class NoopTranslatorFactory extends TranslatorFactory {
  override async availability(): Promise<Availability> {
    return 'unavailable';
  }

  override async create(): Promise<Translator> {
    throw new Error('Translator API is unavailable in this environment.');
  }
}
