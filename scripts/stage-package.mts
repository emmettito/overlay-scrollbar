// Stages the package as it's packed (by npm run package and npm run test:package): the built library, the license, the
// README and a package.json without what only this repository uses. Packed as it is, the package.json would take its
// scripts along, with its devDependencies and npm settings. Installing the tarball, npm 12 would warn the consumer of
// its install scripts, "prepare" (husky) among them, though it never runs "prepare" for a tarball (only for linked and
// git dependencies); a postinstall, say, it would run once they allowed it. Its engines are the Node this repository's
// scripts need, not the library, which needs none. Packing from the repository itself is refused
// (scripts/refuse-root-pack.mts).
import { execFileSync } from 'node:child_process';
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The package.json fields only this repository uses, left out of the package */
export const devOnlyFields = [
  'scripts',
  'devDependencies',
  'engines',
  'devEngines',
  'packageManager',
  'overrides',
  'allowScripts'
];

/**
 * Builds the library and stages the package into a folder, to pack from there
 *
 * @param folder an empty folder
 * @param npm runs npm
 */
export const stagePackage = (folder: string, npm: (args: string[], cwd: string) => string): void => {
  npm(['run', 'build:lib'], root);
  cpSync(join(root, 'lib'), join(folder, 'lib'), { recursive: true });
  for (const file of ['LICENSE', 'README.md']) {
    cpSync(join(root, file), join(folder, file));
  }
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  for (const field of devOnlyFields) {
    delete manifest[field];
  }
  writeFileSync(join(folder, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
};

/** npm itself, run by this Node: npm_execpath when run as an npm script, so no shell is needed on any platform */
const npmCli = process.env['npm_execpath'];
export const npm = (args: string[], cwd: string): string =>
  npmCli
    ? execFileSync(process.execPath, [npmCli, ...args], { cwd, encoding: 'utf8' })
    : execFileSync('npm', args, { cwd, encoding: 'utf8', shell: true });
