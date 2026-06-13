import { test, expect } from './fixtures';

test.describe('Built-in AI Playground routing', () => {
  test('routes / to /summarizer and renders both navigation links', async ({ aiPage }) => {
    await aiPage.goto('/');
    await expect(aiPage).toHaveURL(/\/summarizer$/);
    await expect(aiPage.getByRole('link', { name: 'Summarizer' })).toBeVisible();
    await expect(aiPage.getByRole('link', { name: /Prompt/ })).toBeVisible();
  });
});

test.describe('Built-in AI Prompt', () => {
  test('returns structured caption / mainSubject / tags for the sample image', async ({
    aiPage,
  }) => {
    await aiPage.goto('/prompt');
    await expect(
      aiPage.getByRole('heading', { name: /^Built-in AI Prompt/, level: 1 }),
    ).toBeVisible();

    const caption = aiPage.getByTestId('prompt-caption');
    const mainSubject = aiPage.getByTestId('prompt-main-subject');
    const tags = aiPage.getByTestId('prompt-tags');

    await expect(caption).toBeVisible({ timeout: 240_000 });
    await expect(mainSubject).toBeVisible();
    await expect(tags).toBeVisible();

    const captionText = (await caption.textContent())?.trim() ?? '';
    expect(captionText.length).toBeGreaterThan(20);
    expect(captionText).toMatch(/[぀-ヿ一-鿿]/);

    const mainSubjectText = (await mainSubject.textContent())?.trim() ?? '';
    expect(mainSubjectText.length).toBeGreaterThan(0);

    const tagCount = await tags.locator('li').count();
    expect(tagCount).toBeGreaterThan(0);
  });

  test('switching the sample image re-runs the prompt against the new image', async ({
    aiPage,
  }) => {
    await aiPage.goto('/prompt');

    const caption = aiPage.getByTestId('prompt-caption');
    await expect(caption).toBeVisible({ timeout: 240_000 });

    const firstCaption = (await caption.textContent())?.trim() ?? '';
    expect(firstCaption.length).toBeGreaterThan(0);

    await aiPage.getByRole('button', { name: 'B' }).click();

    await expect
      .poll(async () => (await caption.textContent())?.trim() ?? '', { timeout: 240_000 })
      .not.toBe(firstCaption);

    const secondCaption = (await caption.textContent())?.trim() ?? '';
    expect(secondCaption.length).toBeGreaterThan(20);
    expect(secondCaption).toMatch(/[぀-ヿ一-鿿]/);
  });
});
