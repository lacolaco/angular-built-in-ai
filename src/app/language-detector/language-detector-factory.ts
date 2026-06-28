import { Injectable } from '@angular/core';
import {
  createBuiltinAILanguageDetector,
  getBuiltinAILanguageDetectorAvailability,
  isLanguageDetectionSupported,
} from '../ai/language-detector';

@Injectable({
  providedIn: 'root',
  useFactory: () =>
    isLanguageDetectionSupported
      ? new BuiltinAILanguageDetectorFactory()
      : new NoopLanguageDetectorFactory(),
})
export abstract class LanguageDetectorFactory {
  abstract availability(options?: LanguageDetectorCreateCoreOptions): Promise<Availability>;
  abstract create(options?: LanguageDetectorCreateOptions): Promise<LanguageDetector>;
}

@Injectable()
export class BuiltinAILanguageDetectorFactory extends LanguageDetectorFactory {
  override availability(options?: LanguageDetectorCreateCoreOptions): Promise<Availability> {
    return getBuiltinAILanguageDetectorAvailability(options);
  }

  override create(options?: LanguageDetectorCreateOptions): Promise<LanguageDetector> {
    return createBuiltinAILanguageDetector(options);
  }
}

@Injectable()
export class NoopLanguageDetectorFactory extends LanguageDetectorFactory {
  override async availability(): Promise<Availability> {
    return 'unavailable';
  }

  override async create(): Promise<LanguageDetector> {
    throw new Error('Language Detector API is unavailable in this environment.');
  }
}
