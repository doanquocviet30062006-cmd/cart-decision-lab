import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/e2e', fullyParallel: false, workers: 1, retries: 0, timeout: 45000,
  reporter: [['list'], ['json', { outputFile: 'evidence/browser-tests.json' }]],
  use: { baseURL: process.env.CART_BASE_URL || 'http://localhost:3000', viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
