export const isLanguageDetectionSupported = typeof LanguageDetector !== 'undefined';

export async function getBuiltinAILanguageDetectorAvailability(
  options?: LanguageDetectorCreateCoreOptions,
): Promise<Availability> {
  if (!isLanguageDetectionSupported) return 'unavailable';
  return LanguageDetector.availability(options);
}

export async function createBuiltinAILanguageDetector(
  options: LanguageDetectorCreateOptions = {},
): Promise<LanguageDetector> {
  const availability = await getBuiltinAILanguageDetectorAvailability(options);
  if (availability === 'unavailable') {
    throw new Error('Language Detector API is unavailable on this device.');
  }
  return LanguageDetector.create(options);
}
