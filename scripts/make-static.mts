// Runs after `vite build` (npm's postbuild), so the built app opens straight from disk (file://), without a server.
// Tested by make-static.spec.mts.
//
// Browsers won't load module scripts (<script type="module">) from file://, and Vite emits them. So
// every built page's module scripts are bundled again with esbuild into classic scripts, each with everything it
// imports, and loaded with `defer`, which runs them in the same order as before. `crossorigin` attributes go too:
// over file:// they turn a plain load into a cross-origin request, which fails.
import { build } from 'esbuild';
import { realpathSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Every index.html under `dir` */
async function pages(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await pages(path)));
    } else if (entry.name === 'index.html') {
      found.push(path);
    }
  }
  return found;
}

/** Makes every page under `out` (the build, by default) work from disk */
export async function makeStatic(out: string, log: (message: string) => void = console.log): Promise<void> {
  for (const page of await pages(out)) {
    await makePageStatic(out, page, log);
  }
}

async function makePageStatic(out: string, page: string, log: (message: string) => void): Promise<void> {
  let html = await readFile(page, 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"([^>]*)><\/script>/g)].filter(([tag]) =>
    tag.includes('type="module"')
  );
  for (const [tag, , src] of scripts) {
    const file = join(dirname(page), src);
    await build({
      entryPoints: [file],
      bundle: true,
      format: 'iife',
      outfile: file,
      allowOverwrite: true,
      logLevel: 'error'
    });
    // A function, so nothing in the path is read as a replacement pattern ($&)
    html = html.replace(tag, () => `<script src="${src}" defer></script>`);
  }
  // The chunks those scripts imported are now inside them, so nothing should preload them as modules
  html = html.replace(/<link rel="modulepreload"[^>]*>\s*/g, '').replace(/\s+crossorigin(="[^"]*")?/g, '');
  await writeFile(page, html);
  log(`Made ${relative(out, page)} work from disk (${scripts.length} script${scripts.length === 1 ? '' : 's'})`);
}

// Run directly, as npm's postbuild does: the build in dist/. Compared as real paths, as Node resolves a symlinked path
// to the script in import.meta.url but not in argv.
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  await makeStatic(join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'));
}
