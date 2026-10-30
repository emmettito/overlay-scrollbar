// Builds the packaged library into lib/ (npm run build:lib, and first thing in npm run package and test:package):
// src/overlay-scrollbar compiled by tsconfig.lib.json to JavaScript modules and type declarations, and its
// stylesheet as it is.
import { execFileSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = join(root, 'lib');

rmSync(lib, { recursive: true, force: true });
// TypeScript's compiler, run by this Node rather than through a shell, so it's the same on every platform
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tsc, '-p', join(root, 'tsconfig.lib.json')], { stdio: 'inherit' });
copyFileSync(join(root, 'src/overlay-scrollbar/overlay-scrollbar.css'), join(lib, 'overlay-scrollbar.css'));
console.log('Built the library into lib/');
