import { playwright } from '@vitest/browser-playwright';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { firefoxEnv } from './scripts/firefox-env.mts';

/**
 * The library's specs that need real layout (*.browser.spec.ts), in Chromium, WebKit and Firefox through Playwright.
 * Each spec file runs in its own page, so module state (e.g. the shared ResizeObserver) starts fresh.
 * First `npx playwright install chromium webkit firefox`.
 */
export default defineConfig({
  cacheDir: resolve(import.meta.dirname, 'node_modules/.vite/vitest-browser'),
  test: {
    globals: true,
    include: ['src/overlay-scrollbar/**/*.browser.spec.ts'],
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      instances: [
        { browser: 'chromium', provider: playwright() },
        { browser: 'webkit', provider: playwright() },
        { browser: 'firefox', provider: playwright({ launchOptions: { env: firefoxEnv() } }) }
      ]
    }
  }
});
