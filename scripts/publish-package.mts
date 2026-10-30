// Publishes the package to npm (npm run release): stages it as npm run package does (see stage-package.mts), and
// publishes that folder, so the repository's own scripts and settings stay out of it. With --stage, stages it instead
// (npm stage publish), to be approved on npmjs.com or with npm stage approve before it's published. Anything else after
// -- goes to npm, e.g. --dry-run to see what would be published, or --otp <code>. A prerelease (e.g. 0.2.0-beta.1) goes
// under npm's next tag rather than latest, which is what npm i installs; pass --tag to choose another, e.g. --tag
// v0.1 for a fix to an older version, which would otherwise become latest.
//
//   npm run release
//   npm run release -- --stage
//   npm run release -- --dry-run
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { npm, stagePackage } from './stage-package.mts';

const stage = mkdtempSync(join(tmpdir(), 'publish-'));
process.on('exit', () => rmSync(stage, { recursive: true, force: true }));
stagePackage(stage, npm);
// In the terminal, so npm can ask to log in or for a one-time password
const npmCli = process.env['npm_execpath'];
const options = process.argv.slice(2);
const { version } = JSON.parse(readFileSync(join(stage, 'package.json'), 'utf8'));
if (version.includes('-') && !options.some(option => option === '--tag' || option.startsWith('--tag='))) {
  options.push('--tag', 'next');
}
const args = options.includes('--stage')
  ? ['stage', 'publish', ...options.filter(option => option !== '--stage')]
  : ['publish', ...options];
const { status } = npmCli
  ? spawnSync(process.execPath, [npmCli, ...args], { cwd: stage, stdio: 'inherit' })
  : spawnSync('npm', args, { cwd: stage, stdio: 'inherit', shell: true });
process.exitCode = status ?? 1;
