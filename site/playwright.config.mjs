// Quality gates for the built site (npm run build first). Serves dist/ with
// `astro preview`; CI uses Playwright's Chromium, a local run can set
// PW_CHANNEL=msedge (or chrome) to use an installed browser instead.
import { defineConfig, devices } from '@playwright/test';

const channel = process.env.PW_CHANNEL || undefined;
// PW_BASE_URL reuses a server that is already running (Astro allows only one
// `astro preview` at a time).
const external = process.env.PW_BASE_URL;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: { baseURL: external ?? 'http://localhost:4329', channel },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], channel } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
  ],
  webServer: external
    ? undefined
    : {
        command: 'npx astro preview --port 4329',
        url: 'http://localhost:4329/',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
