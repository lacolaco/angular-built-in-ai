import { test, expect } from './fixtures';

const initButtonName = 'Language Detector を初期化';

test.describe('Built-in AI Language Detector', () => {
  test('detects 日本語 sample as ja with highest confidence', async ({ aiPage }) => {
    await aiPage.goto('/language-detector');
    await expect(
      aiPage.getByRole('heading', { name: 'Built-in AI Language Detector' }),
    ).toBeVisible();

    // Auto-init only fires when availability is 'available' / 'downloading'.
    // On a fresh persistent context with no prior LanguageDetector session,
    // availability can come back as 'downloadable' even when the on-device
    // model is provisioned — the spec must supply the user-activation gesture
    // to call initialize().
    const initButton = aiPage.getByRole('button', { name: initButtonName });
    if (await initButton.isVisible().catch(() => false)) {
      await initButton.click();
    }

    await aiPage.getByRole('button', { name: 'B (日本語)' }).click();

    const top = aiPage.getByTestId('language-detection-top');
    await expect(top).toBeVisible({ timeout: 60_000 });

    const topText = (await top.textContent())?.trim() ?? '';
    // Top result label includes Intl.DisplayNames ja-locale name + code (e.g. "日本語 (ja)").
    expect(topText).toMatch(/\(ja\)/);

    const results = aiPage.getByTestId('language-detection-results');
    await expect(results).toBeVisible();
    const rowCount = await results.locator('li').count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('switching from English to Español re-runs detect with the new input', async ({
    aiPage,
  }) => {
    await aiPage.goto('/language-detector');

    const initButton = aiPage.getByRole('button', { name: initButtonName });
    if (await initButton.isVisible().catch(() => false)) {
      await initButton.click();
    }

    await aiPage.getByRole('button', { name: 'A (English)' }).click();
    const top = aiPage.getByTestId('language-detection-top');
    await expect(top).toBeVisible({ timeout: 60_000 });
    await expect.poll(async () => (await top.textContent())?.trim() ?? '').toMatch(/\(en\)/);

    await aiPage.getByRole('button', { name: 'D (Español)' }).click();
    await expect.poll(async () => (await top.textContent())?.trim() ?? '').toMatch(/\(es\)/);
  });
});
