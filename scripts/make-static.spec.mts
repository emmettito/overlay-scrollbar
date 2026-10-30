import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeStatic } from './make-static.mts';

// A build like Vite's: a page whose module script imports a chunk it preloads, with crossorigin on both
describe('makeStatic', () => {
  let out: string;

  beforeEach(async () => {
    out = await mkdtemp(join(tmpdir(), 'make-static-'));
    await mkdir(join(out, 'assets'));
    await writeFile(join(out, 'assets/chunk.js'), "export const greeting = 'hello from the chunk';\n");
    await writeFile(
      join(out, 'assets/index.js'),
      "import { greeting } from './chunk.js';\ndocument.title = greeting;\n"
    );
    await writeFile(
      join(out, 'index.html'),
      '<!doctype html><html><head>' +
        '<script type="module" crossorigin src="./assets/index.js"></script>' +
        '<link rel="modulepreload" crossorigin href="./assets/chunk.js">' +
        '<link rel="stylesheet" crossorigin href="./assets/index.css">' +
        '</head><body></body></html>'
    );
  });

  afterEach(async () => {
    await rm(out, { recursive: true, force: true });
  });

  it('loads each module script as a classic one, deferred, with no crossorigin or module preloads', async () => {
    await makeStatic(out, () => undefined);
    const html = await readFile(join(out, 'index.html'), 'utf8');
    expect(html).toContain('<script src="./assets/index.js" defer></script>');
    expect(html).not.toContain('type="module"');
    expect(html).not.toContain('modulepreload');
    expect(html).not.toContain('crossorigin');
    expect(html).toContain('<link rel="stylesheet" href="./assets/index.css">');
  });

  it('bundles what each script imports into it, as browsers load no imports from disk', async () => {
    await makeStatic(out, () => undefined);
    const script = await readFile(join(out, 'assets/index.js'), 'utf8');
    expect(script).toContain('hello from the chunk');
    expect(script).not.toMatch(/\bimport\b/);
  });

  it('does the same for the pages in folders below', async () => {
    await mkdir(join(out, 'nested/page/assets'), { recursive: true });
    await writeFile(join(out, 'nested/page/assets/index.js'), 'document.title = "nested";\n');
    await writeFile(
      join(out, 'nested/page/index.html'),
      '<script type="module" crossorigin src="./assets/index.js"></script>'
    );
    const logged: string[] = [];
    await makeStatic(out, message => logged.push(message));
    expect(await readFile(join(out, 'nested/page/index.html'), 'utf8')).toBe(
      '<script src="./assets/index.js" defer></script>'
    );
    expect(logged).toHaveLength(2);
  });
});
