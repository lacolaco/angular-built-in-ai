export const isTranslationSupported = typeof Translator !== 'undefined';

export async function getBuiltinAITranslatorAvailability(
  options: TranslatorCreateCoreOptions,
): Promise<Availability> {
  if (!isTranslationSupported) return 'unavailable';
  return Translator.availability(options);
}

export async function createBuiltinAITranslator(
  options: TranslatorCreateOptions,
): Promise<Translator> {
  const availability = await getBuiltinAITranslatorAvailability(options);
  if (availability === 'unavailable') {
    throw new Error('Translator API is unavailable on this device.');
  }
  return Translator.create(options);
}
