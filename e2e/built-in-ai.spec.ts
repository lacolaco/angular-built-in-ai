import { test, expect } from './fixtures';

test.describe('Built-in AI Playground', () => {
  test('routes / to /summarizer and renders both navigation links', async ({ aiPage }) => {
    await aiPage.goto('/');
    await expect(aiPage).toHaveURL(/\/summarizer$/);
    await expect(aiPage.getByRole('link', { name: 'Summarizer' })).toBeVisible();
    await expect(aiPage.getByRole('link', { name: /Prompt/ })).toBeVisible();
  });

  test('Summarizer page produces a non-empty Japanese summary for sample A', async ({
    aiPage,
  }) => {
    await aiPage.goto('/summarizer');
    await expect(aiPage.getByRole('heading', { name: 'Built-in AI Summarizer' })).toBeVisible();

    await aiPage.getByRole('button', { name: 'A', exact: true }).click();

    const output = aiPage.getByTestId('summarizer-output');
    await expect(output).toBeVisible({ timeout: 180_000 });
    const text = (await output.textContent())?.trim() ?? '';
    expect(text.length).toBeGreaterThan(40);
    expect(text).toMatch(/[぀-ヿ一-鿿]/);
  });

  test('Prompt page returns structured caption / mainSubject / tags for the sample image', async ({
    aiPage,
  }) => {
    await aiPage.goto('/prompt');
    await expect(aiPage.getByRole('heading', { name: /Built-in AI Prompt/ })).toBeVisible();

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
});
