import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the real stack.
 * Prerequisite: the backend is running on :8080 (with an admin account, see README).
 * Playwright starts the Angular dev server itself, or reuses one already on :4200.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // the tests share one database
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
