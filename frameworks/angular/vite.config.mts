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
  // One classic script, demo.js, that defines the demo's element (src/main.ts), rather than a page: the app
  // loads it, and a classic script runs from disk where a module wouldn't (scripts/make-static.mts)
  build: {
    outDir: fileURLToPath(new URL('../../public/frameworks/angular', import.meta.url)),
    emptyOutDir: true,
    rolldownOptions: {
      input: fileURLToPath(new URL('src/main.ts', import.meta.url)),
      output: { format: 'iife', entryFileNames: 'demo.js' }
    }
  }
});
