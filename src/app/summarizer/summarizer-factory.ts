import { Injectable } from '@angular/core';
import {
  createBuiltinAISummarizer,
  getBuiltinAISummarizerAvailability,
  isSummarizationSupported,
} from '../ai/summarizer';

@Injectable({
  providedIn: 'root',
  useFactory: () =>
    isSummarizationSupported ? new BuiltinAISummarizerFactory() : new NoopSummarizerFactory(),
})
export abstract class SummarizerFactory {
  abstract availability(options?: SummarizerCreateCoreOptions): Promise<Availability>;
  abstract create(options?: SummarizerCreateOptions): Promise<Summarizer>;
}

@Injectable()
export class BuiltinAISummarizerFactory extends SummarizerFactory {
  override availability(options?: SummarizerCreateCoreOptions): Promise<Availability> {
    return getBuiltinAISummarizerAvailability(options);
  }

  override create(options?: SummarizerCreateOptions): Promise<Summarizer> {
    return createBuiltinAISummarizer(options);
  }
}

@Injectable()
export class NoopSummarizerFactory extends SummarizerFactory {
  override async availability(): Promise<Availability> {
    return 'unavailable';
  }

  override async create(): Promise<Summarizer> {
    throw new Error('Summarizer API is unavailable in this environment.');
  }
}
