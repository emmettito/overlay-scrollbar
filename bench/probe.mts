// Which of the library's lines make Chromium lay out the page (Layout) or recalculate styles (UpdateLayoutTree) while
// 200 areas are attached: the tool for finding forced layouts. Counts them from a DevTools trace, by the function and
// column in the minified bundle that caused each, so run it before and after a change.
//
//   node bench/probe.mts [library folder]   (this repo's library by default)
import { chromium } from 'playwright';
import { libraryForPage, type LibraryWindow } from './library.mts';

const library = await libraryForPage(process.argv[2]);
const html = `<!doctype html><style>.area{width:300px;height:200px;overflow:auto;display:inline-block;margin:4px}</style>
<style>${library.css}</style><script>${library.script}</script>
<div id=root>${Array.from({ length: 200 }, () => '<div class=area>' + '<p>Row</p>'.repeat(60) + '</div>').join('')}</div>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
const metrics = async (): Promise<Record<string, number>> =>
  Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(metric => [metric.name, metric.value]));
await page.evaluate(() => document.body.offsetHeight);
await cdp.send('Tracing.start', {
  categories: 'devtools.timeline,disabled-by-default-devtools.timeline.stack',
  transferMode: 'ReturnAsStream'
});
const before = await metrics();
await page.evaluate(() => {
  const { attachOverlayScrollbar } = (window as unknown as LibraryWindow).OSB;
  document.querySelectorAll('.area').forEach(area => attachOverlayScrollbar(area, { force: true }));
});
await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve))));
const after = await metrics();
console.log(
  `Attaching 200 areas: ${after.LayoutCount - before.LayoutCount} layouts ` +
    `(${((after.LayoutDuration - before.LayoutDuration) * 1000).toFixed(1)}ms), ` +
    `${after.RecalcStyleCount - before.RecalcStyleCount} style recalculations ` +
    `(${((after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000).toFixed(1)}ms)`
);

const complete = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
await cdp.send('Tracing.end');
const { stream } = (await complete) as { stream: string };
let data = '';
for (;;) {
  const chunk = await cdp.send('IO.read', { handle: stream });
  data += chunk.data;
  if (chunk.eof) {
    break;
  }
}
const trace = JSON.parse(data);
const events: {
  name: string;
  args?: { beginData?: { stackTrace?: { functionName: string; columnNumber: number }[] } };
}[] = trace.traceEvents ?? trace;
const causes: Record<string, number> = {};
for (const event of events) {
  const caller = event.args?.beginData?.stackTrace?.[0];
  if ((event.name === 'Layout' || event.name === 'UpdateLayoutTree') && caller) {
    const cause = `${event.name} ← ${caller.functionName || '?'}:${caller.columnNumber}`;
    causes[cause] = (causes[cause] ?? 0) + 1;
  }
}
console.log(
  Object.entries(causes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
);
await browser.close();
