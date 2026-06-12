import { Injectable } from '@angular/core';
import {
  createBuiltinAILanguageModel,
  getBuiltinAILanguageModelAvailability,
  isLanguageModelSupported,
} from '../ai/language-model';

@Injectable({
  providedIn: 'root',
  useFactory: () =>
    isLanguageModelSupported
      ? new BuiltinAILanguageModelFactory()
      : new NoopLanguageModelFactory(),
})
export abstract class LanguageModelFactory {
  abstract availability(options?: LanguageModelCreateCoreOptions): Promise<Availability>;
  abstract create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
}

@Injectable()
export class BuiltinAILanguageModelFactory extends LanguageModelFactory {
  override availability(options?: LanguageModelCreateCoreOptions): Promise<Availability> {
    return getBuiltinAILanguageModelAvailability(options);
  }

  override create(options?: LanguageModelCreateOptions): Promise<LanguageModel> {
    return createBuiltinAILanguageModel(options);
  }
}

@Injectable()
export class NoopLanguageModelFactory extends LanguageModelFactory {
  override async availability(): Promise<Availability> {
    return 'unavailable';
  }

  override async create(): Promise<LanguageModel> {
    throw new Error('LanguageModel API is unavailable in this environment.');
  }
}
