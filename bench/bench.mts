// Measures the library against native scrollbars, on pages of 20 and 200 scroll areas (300×200, 60 rows, some wide
// enough to scroll sideways): attaching, scrolling one area for 240 frames, a scroll update on its own, and rows being
// added. Chromium runs twice, with the thumbs on scroll-driven animations and on the scroll listener WebKit and Firefox
// use, and twice more with its CPU slowed 4×; then WebKit and Firefox. Chromium also reports script, style and layout
// time through the DevTools protocol.
//
//   npm run bench                         all of it, as a table (several minutes)
//   npm run bench -- webkit               only the runs whose names contain "webkit"
//   npm run bench -- --json               the results as JSON, e.g. to compare against after a change
//   npm run bench -- --summary <file>     the table for results saved as JSON
//   npm run bench -- --library <folder>   another version of the library (a copy of src/overlay-scrollbar), to compare
//
// The numbers depend on the machine: compare only results measured on the same one.
import { readFileSync } from 'node:fs';
import { arch, cpus, platform } from 'node:os';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { type BrowserType, chromium, firefox, type LaunchOptions, webkit } from 'playwright';
import { firefoxEnv } from '../scripts/firefox-env.mts';
import { type Library, libraryForPage, type LibraryWindow } from './library.mts';

interface FrameTimes {
  p50: number;
  p95: number;
  max: number;
  over20: number;
}
type CaseResult = Record<string, number | FrameTimes | undefined>;
type Results = Record<string, Record<string, CaseResult>>;
/** How a run measures: through the DevTools protocol (Chromium only), with the CPU slowed, on the scroll listener */
interface Run {
  cdp?: boolean;
  throttle?: number;
  scrollListener?: boolean;
}

// Faked off, CSS.supports('animation-timeline: …') sends Chromium down the scroll-listener path WebKit and Firefox take
const withoutScrollTimeline =
  'CSS.supports = (supports => query => !/animation-timeline/.test(query) && supports.call(CSS, query))(CSS.supports);';

const pageHtml = (
  library: Library,
  areas: number,
  scrollListener: boolean
): string => `<!doctype html><meta charset=utf-8>
<style>body{margin:0;font:14px system-ui} .area{width:300px;height:200px;overflow:auto;display:inline-block;margin:4px;outline:1px solid #ccc}
.area p{margin:0;padding:6px 10px;border-bottom:1px solid #eee;white-space:nowrap}</style>
<script>${scrollListener ? withoutScrollTimeline : ''}</script>
<style>${library.css}</style><script>${library.script}</script>
<div id=root>${Array.from({ length: areas }, () => '<div class=area>' + Array.from({ length: 60 }, (_, i) => '<p>Row ' + i + (i % 7 ? '' : ' — wide enough to scroll sideways as well, wide enough') + '</p>').join('') + '</div>').join('')}</div>`;

async function measure(
  library: Library,
  type: BrowserType,
  launchOptions: LaunchOptions,
  { cdp = false, throttle = 1, scrollListener = false }: Run
): Promise<Record<string, CaseResult>> {
  const browser = await type.launch(launchOptions);
  const results: Record<string, CaseResult> = {};
  for (const withLibrary of [false, true]) {
    for (const areas of [20, 200]) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      await page.setContent(pageHtml(library, areas, scrollListener));
      // The first frame after the page is set (slow in WebKit) isn't part of attaching
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const session = cdp ? await page.context().newCDPSession(page) : undefined;
      if (session) {
        await session.send('Performance.enable');
        if (throttle > 1) {
          await session.send('Emulation.setCPUThrottlingRate', { rate: throttle });
        }
      }
      const metrics = async (): Promise<Record<string, number>> =>
        session
          ? Object.fromEntries(
              (await session.send('Performance.getMetrics')).metrics.map(metric => [metric.name, metric.value])
            )
          : {};
      await page.evaluate(() => document.body.offsetHeight);
      const before = await metrics();

      // 1. Attach every area, and let the first rendering (where the bars measure) finish
      const attachMs = await page.evaluate(async withLibrary => {
        const start = performance.now();
        if (withLibrary) {
          const { attachOverlayScrollbar } = (window as unknown as LibraryWindow).OSB;
          document.querySelectorAll('.area').forEach(area => attachOverlayScrollbar(area, { force: true }));
        }
        document.body.getBoundingClientRect();
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve)));
        return performance.now() - start;
      }, withLibrary);
      await page.waitForTimeout(300);
      const attached = await metrics();

      // 2. One area scrolled 3px down and 2px across every frame, for 240 frames
      const scrollFrames = await page.evaluate(async () => {
        const area = document.querySelectorAll('.area')[3];
        const times: number[] = [];
        let last = performance.now();
        for (let i = 0; i < 240; i++) {
          await new Promise(resolve => requestAnimationFrame(resolve));
          const now = performance.now();
          times.push(now - last);
          last = now;
          area.scrollTop = (i * 3) % 1500;
          area.scrollLeft = (i * 2) % 300;
        }
        times.sort((a, b) => a - b);
        return { p50: times[120], p95: times[228], max: times[239], over20: times.filter(time => time > 20).length };
      });
      const scrolled = await metrics();

      // 3. One scroll update, synchronously, with the style and layout it causes
      const perScrollUs = await page.evaluate(() => {
        const area = document.querySelectorAll('.area')[5];
        const row = area.querySelector('p') as Element;
        const start = performance.now();
        for (let i = 0; i < 500; i++) {
          area.scrollTop = i % 400;
          area.dispatchEvent(new Event('scroll'));
          area.getBoundingClientRect();
          void getComputedStyle(row).color;
        }
        return ((performance.now() - start) / 500) * 1000;
      });
      const updated = await metrics();

      // 4. 20 rows added to each of 10 areas, and the observers left to run
      const contentChangeMs = await page.evaluate(async () => {
        const start = performance.now();
        for (const area of [...document.querySelectorAll('.area')].slice(0, 10)) {
          for (let i = 0; i < 20; i++) {
            area.appendChild(Object.assign(document.createElement('p'), { textContent: 'New row' }));
          }
        }
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return performance.now() - start;
      });
      const changed = await metrics();

      // A metric's change between two points; durations from seconds to ms
      const delta = (from: Record<string, number>, to: Record<string, number>, name: string): number | undefined =>
        to[name] === undefined
          ? undefined
          : +((to[name] - from[name]) * (name.endsWith('Duration') ? 1000 : 1)).toFixed(1);
      results[`${withLibrary ? 'library' : 'native'} ×${areas}`] = {
        attachMs: +attachMs.toFixed(1),
        ...(session && {
          attachScriptMs: delta(before, attached, 'ScriptDuration'),
          attachLayoutMs: delta(before, attached, 'LayoutDuration'),
          attachLayouts: delta(before, attached, 'LayoutCount'),
          addedNodes: delta(before, attached, 'Nodes')
        }),
        scrollFrames,
        ...(session && {
          scrollScriptMs: delta(attached, scrolled, 'ScriptDuration'),
          scrollStyleMs: delta(attached, scrolled, 'RecalcStyleDuration'),
          scrollLayoutMs: delta(attached, scrolled, 'LayoutDuration'),
          scrollLayouts: delta(attached, scrolled, 'LayoutCount')
        }),
        perScrollUs: +perScrollUs.toFixed(1),
        contentChangeMs: +contentChangeMs.toFixed(1),
        ...(session && { contentScriptMs: delta(updated, changed, 'ScriptDuration') })
      };
      await page.close();
    }
  }
  await browser.close();
  return results;
}

/**
 * One line per case: attach time, frame times while scrolling, and (in Chromium) where the scroll's time went
 */
function summary(results: Results): string {
  const lines = [];
  for (const [run, cases] of Object.entries(results)) {
    lines.push(`== ${run}`);
    for (const [name, result] of Object.entries(cases)) {
      const frames = result.scrollFrames as FrameTimes;
      lines.push(
        `  ${name.padEnd(12)} attach ${String(result.attachMs).padStart(6)}ms` +
          (result.attachLayoutMs !== undefined
            ? ` (layout ${result.attachLayoutMs}ms, ${result.attachLayouts} layouts)`
            : '') +
          ` | frames p95 ${frames.p95.toFixed(1)} max ${frames.max.toFixed(1)} >20ms ${frames.over20}` +
          (result.scrollScriptMs !== undefined
            ? ` | scroll script ${result.scrollScriptMs} style ${result.scrollStyleMs} layout ${result.scrollLayoutMs}ms, ${result.scrollLayouts} layouts`
            : '') +
          ` | per-scroll ${result.perScrollUs}µs | content ${result.contentChangeMs}ms`
      );
    }
  }
  return lines.join('\n');
}

const { values: options, positionals } = parseArgs({
  options: { json: { type: 'boolean' }, summary: { type: 'string' }, library: { type: 'string' } },
  allowPositionals: true
});
// npm runs the script from the package root; a folder given on the command line is from where npm was run
const fromCommandLine = (path: string): string => resolve(process.env['INIT_CWD'] ?? process.cwd(), path);

if (options.summary) {
  const saved = JSON.parse(readFileSync(fromCommandLine(options.summary), 'utf8'));
  console.log(saved.measured ? `Measured ${JSON.stringify(saved.measured)}\n` : '');
  console.log(summary(saved.results ?? saved));
} else {
  const folder = options.library && fromCommandLine(options.library);
  const only = positionals.join(' ');
  const runs: [string, BrowserType, () => LaunchOptions, Run][] = [
    ['chromium (scroll timeline)', chromium, () => ({}), { cdp: true }],
    ['chromium (scroll listener, as WebKit/Firefox)', chromium, () => ({}), { cdp: true, scrollListener: true }],
    ['chromium 4x slower CPU (scroll timeline)', chromium, () => ({}), { cdp: true, throttle: 4 }],
    [
      'chromium 4x slower CPU (scroll listener)',
      chromium,
      () => ({}),
      { cdp: true, throttle: 4, scrollListener: true }
    ],
    ['webkit', webkit, () => ({}), {}],
    ['firefox', firefox, () => ({ env: firefoxEnv() }), {}]
  ];
  const chosen = runs.filter(([name]) => name.includes(only));
  if (!chosen.length) {
    console.error(`No run's name contains "${only}". The runs:\n${runs.map(([name]) => `  ${name}`).join('\n')}`);
    process.exit(1);
  }
  const library = await libraryForPage(folder);
  const results: Results = {};
  for (const [name, type, launchOptions, run] of chosen) {
    if (!options.json) {
      console.error(`Measuring ${name}…`);
    }
    results[name] = await measure(library, type, launchOptions(), run);
  }
  const measured = {
    date: new Date().toISOString().slice(0, 10),
    machine: `${cpus()[0]?.model ?? 'unknown CPU'}, ${platform()} ${arch()}`,
    ...(folder && { library: folder })
  };
  console.log(options.json ? JSON.stringify({ measured, results }, null, 1) : summary(results));
}
