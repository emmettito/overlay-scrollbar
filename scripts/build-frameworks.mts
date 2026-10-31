// Builds the Angular, React, Vue and Svelte demos (frameworks/*) into public/frameworks/<name>/demo.js, a script that
// defines the demo's element, which the app puts on the framework's page. Each needs its own framework's Vite plugin,
// so each is a Vite build of its own.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const frameworks = ['angular', 'react', 'vue', 'svelte'];

for (const name of frameworks) {
  await build({ configFile: join(root, 'frameworks', name, 'vite.config.mts'), logLevel: 'warn' });
  console.log(`Built frameworks/${name} into public/frameworks/${name}/`);
}
