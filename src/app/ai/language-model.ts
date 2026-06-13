export const isLanguageModelSupported = typeof LanguageModel !== 'undefined';

export async function getBuiltinAILanguageModelAvailability(
  options?: LanguageModelCreateCoreOptions,
): Promise<Availability> {
  if (!isLanguageModelSupported) return 'unavailable';
  return LanguageModel.availability(options);
}

export async function createBuiltinAILanguageModel(
  options: LanguageModelCreateOptions = {},
): Promise<LanguageModel> {
  const availability = await getBuiltinAILanguageModelAvailability(options);
  if (availability === 'unavailable') {
    throw new Error('LanguageModel API is unavailable on this device.');
  }
  return LanguageModel.create(options);
}
