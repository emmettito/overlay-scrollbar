// The library as the benchmark pages load it: bundled into one classic script that sets the global OSB, and its
// stylesheet, both inlined into the page
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The library's bundle, as a classic script, and its stylesheet */
export interface Library {
  script: string;
  css: string;
}

/** The global the bundle sets on the page: as much of the library as the pages call */
export interface LibraryWindow {
  OSB: { attachOverlayScrollbar(element: Element, options?: { force?: boolean }): unknown };
}

/**
 * The library in `folder`: this repo's by default, or another version's, to compare the two
 */
export async function libraryForPage(folder?: string): Promise<Library> {
  const library = folder ? resolve(folder) : fileURLToPath(new URL('../src/overlay-scrollbar/', import.meta.url));
  const bundle = await build({
    stdin: {
      contents: "export { attachOverlayScrollbar } from './overlay-scrollbar';",
      resolveDir: library,
      loader: 'ts'
    },
    bundle: true,
    format: 'iife',
    globalName: 'OSB',
    minify: true,
    write: false,
    logLevel: 'warning'
  });
  return {
    script: bundle.outputFiles[0].text,
    css: await readFile(join(library, 'overlay-scrollbar.css'), 'utf8')
  };
}
