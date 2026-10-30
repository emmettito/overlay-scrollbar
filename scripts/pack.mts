// Packs the package into a .tgz (npm run package): builds lib/, stages it with the license, the README and a trimmed
// package.json (see stage-package.mts), and packs that as overlay-scrollbar-<version>.tgz.
//
//   npm run package                              into the folder npm was run from
//   npm run package -- --destination <folder>    into another folder
import { mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { npm, stagePackage } from './stage-package.mts';

const { values } = parseArgs({ options: { destination: { type: 'string' } } });
// npm runs the script from the package root; a folder given on the command line is from where npm was run
const from = process.env['INIT_CWD'] ?? process.cwd();
const destination = resolve(from, values.destination ?? '.');
mkdirSync(destination, { recursive: true });

// Staged first, then packed from there (see stage-package.mts)
const stage = mkdtempSync(join(tmpdir(), 'pack-'));
process.on('exit', () => rmSync(stage, { recursive: true, force: true }));
stagePackage(stage, npm);
const report = JSON.parse(npm(['pack', '--json', '--pack-destination', destination], stage));
// npm 12 reports by package name; npm 11 and earlier as a list
const packed = Array.isArray(report) ? report[0] : Object.values(report)[0];
const file = join(destination, `overlay-scrollbar-${packed.version}.tgz`);
renameSync(join(destination, packed.filename), file);
console.log(`Packed ${packed.name}@${packed.version} into ${file}`);
