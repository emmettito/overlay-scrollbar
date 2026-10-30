// Publishes the package to npm (npm run release): stages it as npm run package does (see stage-package.mts), and
// publishes that folder, so the repository's own scripts and settings stay out of it. Anything after -- goes to
// npm publish, e.g. --dry-run to see what would be published, or --otp <code>.
//
//   npm run release
//   npm run release -- --dry-run
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { npm, stagePackage } from './stage-package.mts';

const stage = mkdtempSync(join(tmpdir(), 'publish-'));
process.on('exit', () => rmSync(stage, { recursive: true, force: true }));
stagePackage(stage, npm);
// In the terminal, so npm can ask to log in or for a one-time password
const npmCli = process.env['npm_execpath'];
const args = ['publish', ...process.argv.slice(2)];
const { status } = npmCli
  ? spawnSync(process.execPath, [npmCli, ...args], { cwd: stage, stdio: 'inherit' })
  : spawnSync('npm', args, { cwd: stage, stdio: 'inherit', shell: true });
process.exitCode = status ?? 1;
