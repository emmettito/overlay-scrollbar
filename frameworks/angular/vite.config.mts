import angular from '@analogjs/vite-plugin-angular';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [
    angular({
      workspaceRoot: fileURLToPath(new URL('.', import.meta.url)),
      tsconfig: fileURLToPath(new URL('tsconfig.app.json', import.meta.url)),
      // The plugin skips type checking by default; this fails the build on type and template errors, as ng build does
      disableTypeChecking: false
    })
  ],
  resolve: {
    alias: { '@emmettito/overlay-scrollbar': fileURLToPath(new URL('../../src/overlay-scrollbar', import.meta.url)) }
  },
  build: { outDir: fileURLToPath(new URL('../../public/frameworks/angular', import.meta.url)), emptyOutDir: true }
});
