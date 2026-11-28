import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PW_CHROMIUM || undefined;
/** Port du serveur de prévisualisation (PW_PORT pour éviter les collisions sur une machine partagée). */
const port = Number(process.env.PW_PORT) || 4173;

export default defineConfig({
  testDir: 'e2e',
  timeout: 240_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'off',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'bureau', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 }, launchOptions: { executablePath } }, testIgnore: /mobile/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath } }, testMatch: /mobile/ },
  ],
  webServer: {
    command: `npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
