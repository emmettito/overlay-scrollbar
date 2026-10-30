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
  build: { outDir: fileURLToPath(new URL('../../public/frameworks/react', import.meta.url)), emptyOutDir: true }
});
