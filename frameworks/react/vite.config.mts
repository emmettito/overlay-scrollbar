import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@emmettito/overlay-scrollbar': fileURLToPath(new URL('../../src/overlay-scrollbar', import.meta.url)) }
  },
  // One classic script, demo.js, that defines the demo's element (src/main.tsx), rather than a page: the app
  // loads it, and a classic script runs from disk where a module wouldn't (scripts/make-static.mts)
  build: {
    outDir: fileURLToPath(new URL('../../public/frameworks/react', import.meta.url)),
    emptyOutDir: true,
    rolldownOptions: {
      input: fileURLToPath(new URL('src/main.tsx', import.meta.url)),
      output: { format: 'iife', entryFileNames: 'demo.js' }
    }
  }
});
