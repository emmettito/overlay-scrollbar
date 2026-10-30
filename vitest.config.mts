import { defineConfig } from 'vitest/config';

// The unit specs: in jsdom, the library's, the demo app's, and the framework wrappers' (frameworks/vitest.config.mts
// for React, Vue and Svelte, frameworks/angular/vitest.config.mts for Angular); in Node, the build scripts'.
// *.browser.spec.ts run in real browsers instead (vitest.browser.config.mts).
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
      },
      { test: { ...jsdom, name: 'app', include: ['src/demos/**/*.spec.ts'] } },
      // The build scripts, in Node
      { test: { name: 'scripts', environment: 'node', include: ['scripts/**/*.spec.mts'] } },
      './frameworks/vitest.config.mts',
      './frameworks/angular/vitest.config.mts'
    ]
  }
});
