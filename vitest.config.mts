import { defineConfig } from 'vitest/config';

// The unit specs: the library's, in jsdom. *.browser.spec.ts run in real browsers instead (vitest.browser.config.mts).
const jsdom = { globals: true, environment: 'jsdom' as const, setupFiles: ['./src/overlay-scrollbar/vitest-setup.ts'] };

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          ...jsdom,
          name: 'library',
          // For when-connected.spec.ts, which checks an element is let go by garbage collecting
          execArgv: ['--expose-gc'],
          include: ['src/overlay-scrollbar/**/*.spec.ts'],
          exclude: ['src/overlay-scrollbar/**/*.browser.spec.ts']
        }
      }
    ]
  }
});
