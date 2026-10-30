# overlay-scrollbar

Overlay scrollbars for any scrollable element, in plain TypeScript with no dependencies.

## Using the library

The package isn't on npm. Build it from this repository, then install the file it writes:

```sh
npm run package
npm install <path to>/overlay-scrollbar-<version>.tgz
```

```ts
import '@emmettito/overlay-scrollbar/overlay-scrollbar.css';
import { attachOverlayScrollbar } from '@emmettito/overlay-scrollbar';

const scrollbar = attachOverlayScrollbar(element);
```

Options, theming and limits are in the [library's README](src/overlay-scrollbar/README.md).

## Developing

You need Node 22.18 or later and npm 12 or later.

```sh
npm install
npm run typecheck      # the library, its specs, and the configs and scripts
npm run lint           # ESLint (npm run format formats the code with Prettier)
npm run test           # the unit specs, in jsdom
npm run test:browser   # the browser specs, in Chromium, WebKit and Firefox
npm run build:lib      # builds the library into lib/
npm run package        # builds and packs it as overlay-scrollbar-<version>.tgz
npm run test:package   # packs it, installs it in a temporary project, and checks it works there
npm run bench          # performance against native scrollbars, in all three browsers (several minutes)
```

The browser specs and the benchmark need Playwright's browsers: `npx playwright install chromium webkit firefox`, with `--with-deps` on Linux.

`npm pack` and `npm publish` are refused from the repository root, because they'd include the repository's own scripts and settings. Use `npm run package` instead.

## What's where

- `src/overlay-scrollbar/`: the library, with its specs and README. `index.ts` is the public API, and everything else is internal. `overlay-scrollbar.ts` attaches the bars, `overlay-scrollbar-frame.ts` and `overlay-scrollbar-bar.ts` draw them, and `overlay-scrollbar.css` is the stylesheet. How it works is described at the top of `overlay-scrollbar.ts`.
- `scripts/`: building and packing the package, and helpers for the tests and benchmark.
- `bench/`: the benchmark, whose options are listed at the top of `bench.mts`, and `probe.mts` (`node bench/probe.mts`), which finds the lines of the library that make Chromium recalculate layout.

## Tests

- Unit specs (`*.spec.ts`) sit next to the code and run in jsdom. `vitest-setup.ts` stands in for the browser APIs jsdom lacks.
- Browser specs (`*.browser.spec.ts`) cover what needs real layout.
- `npm run test:package` checks the package as an app would get it: its contents, importing it in Node, its stylesheet, its types under each kind of module resolution, and bundling it.
