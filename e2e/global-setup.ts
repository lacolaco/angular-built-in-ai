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

  const context = await chromium.launchPersistentContext(AI_USER_DATA_DIR, {
    ...aiLaunchOptions,
    headless: process.env['HEADED'] !== '1',
  });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${baseURL}/summarizer`, { waitUntil: 'domcontentloaded' });

    const summarizer = await page.evaluate(async () => {
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
    });
    if (!summarizer.ok) {
      throw new Error(`Built-in AI Summarizer cannot be provisioned: ${summarizer.reason}`);
    }
    console.log(`[global-setup] Summarizer ready (cached=${summarizer.cached})`);

    const lm = await page.evaluate(async () => {
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
    });
    if (!lm.ok) {
      throw new Error(`Built-in AI LanguageModel cannot be provisioned: ${lm.reason}`);
    }
    console.log(`[global-setup] LanguageModel ready (cached=${lm.cached})`);
  } finally {
    await context.close();
  }
}
