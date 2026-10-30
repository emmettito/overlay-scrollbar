import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [svelte()],
  resolve: {
    alias: { '@emmettito/overlay-scrollbar': fileURLToPath(new URL('../../src/overlay-scrollbar', import.meta.url)) }
  },
  build: { outDir: fileURLToPath(new URL('../../public/frameworks/svelte', import.meta.url)), emptyOutDir: true }
});
