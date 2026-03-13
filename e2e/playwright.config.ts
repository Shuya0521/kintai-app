import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'iphone-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:app',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      cwd: '..',
      timeout: 120000,
    },
    {
      command: 'npm run dev:admin',
      url: 'http://localhost:3001',
      reuseExistingServer: !process.env.CI,
      cwd: '..',
      timeout: 120000,
    },
  ],
})
