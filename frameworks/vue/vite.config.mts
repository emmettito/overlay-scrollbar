import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [vue()],
  resolve: {
    alias: { '@emmettito/overlay-scrollbar': fileURLToPath(new URL('../../src/overlay-scrollbar', import.meta.url)) }
  },
  build: { outDir: fileURLToPath(new URL('../../public/frameworks/vue', import.meta.url)), emptyOutDir: true }
});
