// Checks the package as someone installing it gets it (npm run test:package): packs it (which builds lib/), checks
// what's in it, installs it (running no scripts) into a temporary project, and there imports it in Node, resolves its
// stylesheet, type-checks a use of it under Node's, a bundler's and Node10 module resolution, and bundles it with
// esbuild.
import { build } from 'esbuild';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devOnlyFields, npm, stagePackage } from './stage-package.mts';

const name = '@emmettito/overlay-scrollbar';
const work = mkdtempSync(join(tmpdir(), 'test-package-'));
process.on('exit', () => rmSync(work, { recursive: true, force: true }));

const failures: string[] = [];
const check = (ok: boolean, what: string): void => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) {
    failures.push(what);
  }
};

// 1. What's in the package: staged, then packed from there, as npm run package does
const stage = join(work, 'stage');
mkdirSync(stage);
stagePackage(stage, npm);
const report = JSON.parse(npm(['pack', '--json', '--pack-destination', work], stage));
// npm 12 reports by package name; npm 11 and earlier as a list
const packed = Array.isArray(report) ? report[0] : report[name];
const files = packed.files.map((file: { path: string }) => file.path);
check(
  ['lib/index.js', 'lib/index.d.ts', 'lib/overlay-scrollbar.css', 'LICENSE', 'README.md', 'package.json'].every(file =>
    files.includes(file)
  ),
  `the package has the built library, its stylesheet, the license and the README (${files.length} files)`
);
check(
  !files.some((file: string) => /\.spec\.|vitest-setup|^src\/|\.ts$/.test(file.replace(/\.d\.ts$/, ''))),
  'the package has no source, specs or test setup'
);

// 2. Installed into a project of its own, without --ignore-scripts, so npm would run or warn about any script it has
// (npm 12 blocks a dependency's scripts and warns of them as install-scripts)
const project = join(work, 'project');
mkdirSync(project);
writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }));
const npmCli = process.env['npm_execpath'];
const installArgs = ['install', join(work, packed.filename), '--no-audit', '--no-fund'];
const install = npmCli
  ? spawnSync(process.execPath, [npmCli, ...installArgs], { cwd: project, encoding: 'utf8' })
  : spawnSync('npm', installArgs, { cwd: project, encoding: 'utf8', shell: true });
check(install.status === 0, `it installs${install.status === 0 ? '' : `:\n${install.stderr}`}`);
const manifest = JSON.parse(readFileSync(join(project, 'node_modules', name, 'package.json'), 'utf8'));
const leftOver = devOnlyFields.filter(field => field in manifest);
check(
  !leftOver.length,
  `its package.json has none of the repository's own fields${leftOver.length ? `: ${leftOver.join(', ')}` : ''}`
);
check(
  !/install-scripts|prepare|postinstall/.test(install.stdout + install.stderr),
  'installing it runs no scripts and warns of none'
);

// 3. Imported in Node (safe on the server: importing touches no DOM)
const exported = execFileSync(
  process.execPath,
  ['--input-type=module', '-e', `import * as m from '${name}'; console.log(Object.keys(m).sort().join(','))`],
  { cwd: project, encoding: 'utf8' }
).trim();
check(exported === 'attachOverlayScrollbar,autoAttachOverlayScrollbars', `Node imports it: ${exported}`);

const resolves = (specifier: string): boolean => {
  try {
    execFileSync(process.execPath, ['--input-type=module', '-e', `import.meta.resolve('${specifier}')`], {
      cwd: project,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
};
check(resolves(`${name}/overlay-scrollbar.css`), 'its stylesheet resolves');
check(!resolves(`${name}/lib/overlay-scrollbar.js`), 'its internals are not exported');

// 4. Type-checked as a TypeScript app would use it, under each module resolution
writeFileSync(
  join(project, 'use.ts'),
  `import { attachOverlayScrollbar, autoAttachOverlayScrollbars, type OverlayScrollbarOptions, type OverlayScrollbarRef } from '${name}';
const options: OverlayScrollbarOptions = { autoHide: 'leave', hideAfterScroll: 1000 };
const ref: OverlayScrollbarRef = attachOverlayScrollbar(document.body, options);
ref.update();
const stop: () => void = autoAttachOverlayScrollbars('.scroll', document.body, { force: true });
stop();
// @ts-expect-error: not an option
attachOverlayScrollbar(document.body, { colour: 'red' });
`
);
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
// Node10 (Angular projects' "node") ignores exports, so its types come from the top-level "types"; TypeScript 6
// deprecates it, so it's checked with that warning silenced
for (const [module, moduleResolution, ...more] of [
  ['NodeNext', 'NodeNext'],
  ['ESNext', 'Bundler'],
  ['ESNext', 'Node10', '--ignoreDeprecations', '6.0']
]) {
  try {
    execFileSync(
      process.execPath,
      [
        tsc,
        '--noEmit',
        '--strict',
        '--target',
        'ES2022',
        '--lib',
        'ES2022,DOM',
        '--module',
        module,
        '--moduleResolution',
        moduleResolution,
        ...more,
        'use.ts'
      ],
      { cwd: project, encoding: 'utf8' }
    );
    check(true, `its types work with moduleResolution ${moduleResolution}`);
  } catch (error) {
    check(false, `its types work with moduleResolution ${moduleResolution}:\n${(error as { stdout: string }).stdout}`);
  }
}

// 5. Bundled, with its stylesheet, as an app's bundler would
writeFileSync(
  join(project, 'app.js'),
  `import '${name}/overlay-scrollbar.css';\nimport { attachOverlayScrollbar } from '${name}';\nattachOverlayScrollbar(document.body);\n`
);
const bundle = await build({
  entryPoints: [join(project, 'app.js')],
  bundle: true,
  outdir: join(project, 'out'),
  write: false,
  logLevel: 'silent',
  absWorkingDir: project
});
const outputs = bundle.outputFiles.map(file => file.path.split(/[\\/]/).pop());
check(
  outputs.includes('app.js') &&
    outputs.includes('app.css') &&
    bundle.outputFiles.some(file => file.text.includes('@layer overlay-scrollbar')),
  'esbuild bundles it with its stylesheet'
);

if (failures.length) {
  console.error(`\n${failures.length} check${failures.length === 1 ? '' : 's'} failed`);
  process.exit(1);
}
console.log(`\n${packed.filename} works as an installed package`);
