import { defineConfig } from '@playwright/test';

const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:4200';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 5 * 60 * 1000,
  expect: { timeout: 60 * 1000 },
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm start --port 4200',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
