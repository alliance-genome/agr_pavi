import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright smoke suite for the PAVI webUI.
 *
 * By default this starts `next dev` in mock-API mode (MOCK_API=true), so no
 * backend, AWS or pipeline is needed. Set PLAYWRIGHT_BASE_URL to reuse a
 * webUI already running in mock mode (`npm run dev:mock`) instead.
 */
const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
// Trailing slash so relative paths in specs resolve under a base path (e.g. /pavi/).
const baseURL = (externalBaseUrl ?? `http://localhost:${port}`).replace(/\/?$/, '/');

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    // First hits on `next dev` compile routes on demand.
    timeout: 90_000,
    expect: { timeout: 20_000 },
    use: {
        baseURL,
        trace: 'retain-on-failure',
        // Same full-HD viewport the Cypress suite uses.
        viewport: { width: 1920, height: 1080 },
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    ],
    webServer: externalBaseUrl
        ? undefined
        : {
              command: `npx next dev --port ${port}`,
              url: `${baseURL}health`,
              reuseExistingServer: !process.env.CI,
              timeout: 180_000,
              env: {
                  MOCK_API: 'true',
                  PAVI_API_BASE_URL: `http://localhost:${port}`,
              },
          },
});
