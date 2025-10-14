import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 0
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
