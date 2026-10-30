import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// The React hook's, Vue directive's and Svelte action's specs, in jsdom (run by the root vitest.config.mts). None needs
// its framework's compiler: the hook renders with createElement, the directive with a render function, and the action
// is a plain function. The Angular directive has a project of its own, as Angular templates do need compiling.
export default defineConfig({
  root: here('.'),
  resolve: { alias: { '@emmettito/overlay-scrollbar': here('../src/overlay-scrollbar') } },
  test: {
    name: 'frameworks',
    // For the library's vitest-setup.ts; the specs import what they use, as the demos' tsconfigs have no test globals
    globals: true,
    environment: 'jsdom',
    include: ['{react,vue,svelte}/src/**/*.spec.ts'],
    setupFiles: [here('../src/overlay-scrollbar/vitest-setup.ts')]
  }
});
