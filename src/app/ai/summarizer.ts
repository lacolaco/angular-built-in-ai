export const isSummarizationSupported = 'Summarizer' in self;

export async function getBuiltinAISummarizerAvailability(
  options?: SummarizerCreateCoreOptions,
): Promise<Availability> {
  if (!isSummarizationSupported) return 'unavailable';
  return Summarizer.availability(options);
}

export async function createBuiltinAISummarizer(
  options: SummarizerCreateOptions = {},
): Promise<Summarizer> {
  const availability = await getBuiltinAISummarizerAvailability(options);
  if (availability === 'unavailable') {
    throw new Error('Summarizer API is unavailable on this device.');
  }
  return Summarizer.create(options);
}
