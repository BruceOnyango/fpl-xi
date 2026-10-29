import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // The app lives under its deployed base path; specs navigate with relative URLs ('./players').
  use: { baseURL: 'http://localhost:4173/fantasy-league/', trace: 'on-first-retry' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // `--mode e2e` skips .env.production, so the e2e build keeps the MSW mock API.
    command: 'npx vite build --mode e2e && npm run preview -- --port 4173',
    url: 'http://localhost:4173/fantasy-league/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
