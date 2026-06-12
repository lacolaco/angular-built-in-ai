import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import { AI_USER_DATA_DIR, aiLaunchOptions } from './ai-chrome-options';

// IMPORTANT: `aiContext` / `aiPage` are SHARED across every test in a worker.
// Built-in AI requires a persistent user-data-dir (the on-device model cache),
// and a persistent context cannot be re-created per test without losing the
// cache. Tests using these fixtures MUST be tolerant of state leakage between
// tests (cookies, IndexedDB, service workers, localStorage). If a fresh
// context is required, use Playwright's default `context` fixture and accept
// the model-download cost.
interface AIWorkerFixtures {
  aiContext: BrowserContext;
}
interface AITestFixtures {
  aiPage: Page;
}

export const test = base.extend<AITestFixtures, AIWorkerFixtures>({
  aiContext: [
    async ({ headless }, use) => {
      fs.mkdirSync(AI_USER_DATA_DIR, { recursive: true });
      const context = await chromium.launchPersistentContext(AI_USER_DATA_DIR, {
        ...aiLaunchOptions,
        headless,
        viewport: { width: 1280, height: 900 },
      });
      await use(context);
      await context.close();
    },
    // Worker scope matches the SingletonLock invariant on the profile dir and
    // avoids re-acquiring the lock per test.
    { scope: 'worker' },
  ],
  aiPage: async ({ aiContext }, use) => {
    const page = aiContext.pages()[0] ?? (await aiContext.newPage());
    await use(page);
  },
});

export { expect } from '@playwright/test';
