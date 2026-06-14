import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import { AI_USER_DATA_DIR, aiLaunchOptions } from './ai-chrome-options';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) {
    throw new Error(
      'globalSetup: baseURL is not configured. Set `use.baseURL` in playwright.config.ts.',
    );
  }

  fs.mkdirSync(AI_USER_DATA_DIR, { recursive: true });

  // Read `headless` from the resolved Playwright config (which is what
  // `--headed` and `use.headless` collapse into), so global-setup and the
  // per-test fixtures always agree on launch mode. Playwright's default is
  // headless when unset.
  const headless = config.projects[0]?.use.headless ?? true;
  const context = await chromium.launchPersistentContext(AI_USER_DATA_DIR, {
    ...aiLaunchOptions,
    headless,
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    // Navigate to the app root. The page only needs to be a same-origin
    // document so that `Summarizer` / `LanguageModel` resolve on `self`; we
    // do not depend on any particular route existing.
    await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });

    // Probe Summarizer and LanguageModel concurrently. Both ride the same
    // Optimization Guide on-device Gemini Nano backend, so the model download
    // itself is single-pass either way — but kicking the two evaluations off
    // together lets the second probe avoid an extra cold CDP round-trip after
    // the first completes.
    //
    // Translator is NOT probed here. Its `create()` requires a user-activation
    // gesture when availability is `'downloadable'` / `'downloading'`, which
    // `page.evaluate` cannot supply. Driving the translator page through the
    // browser requires a real `locator.click()` to initialise each language
    // pair, so model provisioning happens lazily under user interaction rather
    // than at global setup.
    const [summarizer, lm] = await Promise.all([
      page.evaluate(async () => {
        if (!('Summarizer' in self)) {
          return { ok: false, reason: 'Summarizer API not present' };
        }
        const options = { outputLanguage: 'ja' as const };
        const a = await Summarizer.availability(options);
        if (a === 'unavailable') {
          return { ok: false, reason: 'Summarizer permanently unavailable' };
        }
        if (a === 'available') return { ok: true, cached: true };
        const s = await Summarizer.create(options);
        s.destroy();
        return { ok: true, cached: false };
      }),
      page.evaluate(async () => {
        if (!('LanguageModel' in self)) {
          return { ok: false, reason: 'LanguageModel API not present' };
        }
        const options = {
          expectedInputs: [
            { type: 'text' as const, languages: ['ja'] },
            { type: 'image' as const },
          ],
          expectedOutputs: [{ type: 'text' as const, languages: ['ja'] }],
        };
        const a = await LanguageModel.availability(options);
        if (a === 'unavailable') {
          return { ok: false, reason: 'LanguageModel permanently unavailable' };
        }
        if (a === 'available') return { ok: true, cached: true };
        const m = await LanguageModel.create(options);
        m.destroy();
        return { ok: true, cached: false };
      }),
    ]);

    if (!summarizer.ok) {
      throw new Error(`Built-in AI Summarizer cannot be provisioned: ${summarizer.reason}`);
    }
    console.log(`[global-setup] Summarizer ready (cached=${summarizer.cached})`);
    if (!lm.ok) {
      throw new Error(`Built-in AI LanguageModel cannot be provisioned: ${lm.reason}`);
    }
    console.log(`[global-setup] LanguageModel ready (cached=${lm.cached})`);
  } finally {
    await context.close();
  }
}
