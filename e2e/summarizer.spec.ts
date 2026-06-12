import { test, expect } from './fixtures';

test.describe('Built-in AI Summarizer', () => {
  test('produces a non-empty Japanese summary for sample A', async ({ aiPage }) => {
    await aiPage.goto('/');
    await expect(aiPage.getByRole('heading', { name: 'Built-in AI Summarizer' })).toBeVisible();

    await aiPage.getByRole('button', { name: 'A', exact: true }).click();

    const output = aiPage.getByTestId('summarizer-output');
    await expect(output).toBeVisible({ timeout: 180_000 });
    const text = (await output.textContent())?.trim() ?? '';
    expect(text.length).toBeGreaterThan(40);
    expect(text).toMatch(/[぀-ヿ一-鿿]/);
  });
});
