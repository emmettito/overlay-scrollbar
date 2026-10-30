import angular from '@analogjs/vite-plugin-angular';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// The Angular demo's specs, in jsdom, compiled by the same plugin as the demo (run by the root vitest.config.mts)
export default defineConfig({
  root: here('.'),
  cacheDir: here('../../node_modules/.vite/frameworks/angular-test'),
  plugins: [angular({ workspaceRoot: here('.'), tsconfig: here('tsconfig.spec.json'), disableTypeChecking: false })],
  resolve: { alias: { '@emmettito/overlay-scrollbar': here('../../src/overlay-scrollbar') } },
  test: {
    name: 'angular',
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    // The library's jsdom stand-ins, then Angular's test environment
    setupFiles: [here('../../src/overlay-scrollbar/vitest-setup.ts'), here('test-setup.ts')]
  }
});
