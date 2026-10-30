// Opens the build (npm run build) straight from disk, as a file:// URL, in Chromium, WebKit and Firefox, and checks
// every page: no errors, and the comparison pages' library columns have their bars. Run with `npm run test:static`,
// which builds first; first `npx playwright install chromium webkit firefox`.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type BrowserType, chromium, firefox, webkit } from 'playwright';
import { firefoxEnv } from './firefox-env.mts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = pathToFileURL(join(root, 'dist/index.html')).href;

// Each route, and how many of the page's own frames (bars) it should have
const routes = {
  '': 1,
  list: 1,
  'changing-content': 1,
  table: 1,
  dialog: 0,
  nested: 5,
  rtl: 2,
  virtual: 1,
  'drag-drop': 2,
  styling: 9
};

const failures: string[] = [];

// The library's cascade layer has to be declared before any other, or a page's own layered styles can't override it:
// the first layer in the build's stylesheets, in the order the page links them, is the library's. (Read here rather
// than in the page, which can't read a stylesheet's rules opened from disk.)
const built = readFileSync(join(root, 'dist/index.html'), 'utf8');
const css = [...built.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)]
  .map(([, href]) => readFileSync(join(root, 'dist', href), 'utf8'))
  .join('\n');
const firstLayer = /@layer\s+([\w-]+)/.exec(css)?.[1];
if (firstLayer !== 'overlay-scrollbar') {
  failures.push(`the first cascade layer is ${firstLayer}, not the library's`);
}
const browsers: [string, BrowserType, NodeJS.ProcessEnv?][] = [
  ['chromium', chromium],
  ['webkit', webkit],
  ['firefox', firefox, firefoxEnv()]
];
for (const [name, type, env] of browsers) {
  const browser = await type.launch({ env });
  const tab = await browser.newPage();
  const errors: string[] = [];
  tab.on('pageerror', error => errors.push(String(error)));
  tab.on('console', message => message.type() === 'error' && errors.push(message.text()));
  const fail = (what: string): void => {
    failures.push(`${name}: ${what}`);
  };

  for (const [route, bars] of Object.entries(routes)) {
    await tab.goto(`${page}#/${route}`);
    await tab.waitForTimeout(500);
    const drawn = await tab.evaluate(() => document.querySelectorAll('main .overlay-scrollbar-frame').length);
    if (!(await tab.locator('main h1').count())) {
      fail(`#/${route} rendered nothing`);
    } else if (drawn !== bars) {
      fail(`#/${route} has ${drawn} bars, not ${bars}`);
    }
  }

  // The Styling page's Cascade layers example: the later layer's colour wins
  await tab.goto(`${page}#/styling`);
  await tab.waitForTimeout(500);
  const thumb = await tab.evaluate(() => {
    const element = document.querySelector('.layered + .overlay-scrollbar-frame .overlay-scrollbar-thumb');
    return element && getComputedStyle(element).backgroundColor;
  });
  if (thumb !== 'rgb(94, 106, 210)') {
    fail(`the Cascade layers example's thumb is ${thumb}, not the later layer's violet`);
  }

  // The Dialog page: bars inside the dialog, kept open by a text selection dragged out of it, closed by a click on
  // the backdrop, and its bars gone with it
  await tab.goto(`${page}#/dialog`);
  await tab.click('[data-action=open]');
  const dialogBars = (): Promise<number> => tab.locator('dialog .overlay-scrollbar-frame').count();
  const row = await tab.locator('dialog .box p').first().boundingBox();
  const box = await tab.locator('dialog').boundingBox();
  if (!row || !box || !(await dialogBars())) {
    fail('the dialog has no bars');
  } else {
    await tab.mouse.move(row.x + 20, row.y + 10);
    await tab.mouse.down();
    await tab.mouse.move(box.x + box.width + 40, row.y + 10, { steps: 5 });
    await tab.mouse.up();
    if (!(await tab.evaluate(() => document.querySelector('dialog')?.open))) {
      fail('dragging a selection out of the dialog closed it');
    }
    await tab.mouse.click(box.x + box.width + 40, box.y + box.height + 40);
    // The dialog's close event, which removes its bars, comes in a task of its own. (Firefox sends the click that ends
    // a drag to the element under it rather than the dialog, so only Chromium and WebKit can show the bug it catches.)
    await tab.waitForTimeout(200);
    if ((await tab.evaluate(() => document.querySelector('dialog')?.open)) || (await dialogBars())) {
      fail("a click on the dialog's backdrop didn't close it and remove its bars");
    }
  }

  // The theme toggle switches the theme, and with it which of the Styling page's two panels shows
  await tab.goto(`${page}#/styling`);
  const shown = (): Promise<{ theme?: string; panel?: string }> =>
    tab.evaluate(() => ({
      theme: document.documentElement.dataset['theme'],
      panel: [...document.querySelectorAll<HTMLElement>('.examples .panel h2')].find(
        heading => heading.offsetParent && /panel$/.test(heading.textContent ?? '')
      )?.textContent
    }));
  const before = await shown();
  await tab.click('.theme-toggle');
  const after = await shown();
  if (before.theme === after.theme || before.panel === after.panel || !after.panel) {
    fail(`the theme toggle went from ${JSON.stringify(before)} to ${JSON.stringify(after)}`);
  }

  // Unknown routes, including ones named like Object's own properties, go home
  for (const route of ['nowhere', 'toString']) {
    await tab.goto(`${page}#/${route}`);
    await tab.waitForTimeout(300);
    if (
      !(await tab.evaluate(
        () => location.hash === '#/' && document.querySelector('main h1')?.textContent === 'overlay-scrollbar'
      ))
    ) {
      fail(`#/${route} didn't go home`);
    }
  }

  // On a phone-sized screen (a short one, to try the dialog): no page wider than the screen, the menu slides out with
  // the page behind it inert and a link closes it, and the dialog keeps its Done button on screen
  await tab.setViewportSize({ width: 390, height: 600 });
  for (const route of Object.keys(routes)) {
    await tab.goto(`${page}#/${route}`);
    await tab.waitForTimeout(200);
    const width = await tab.evaluate(() => document.documentElement.scrollWidth);
    if (width > 390) {
      fail(`#/${route} is ${width}px wide on a 390px screen`);
    }
  }
  await tab.goto(`${page}#/list`);
  await tab.click('.menu-button');
  await tab.waitForTimeout(300);
  if (
    !(await tab.evaluate(() => document.body.classList.contains('nav-open') && document.querySelector('main')?.inert))
  ) {
    fail("the menu didn't open, with the page behind it inert");
  }
  await tab.click('nav a[href="#/styling"]');
  await tab.waitForTimeout(300);
  if (await tab.evaluate(() => document.body.classList.contains('nav-open') || location.hash !== '#/styling')) {
    fail("a link in the menu didn't close it and go to its page");
  }
  await tab.goto(`${page}#/dialog`);
  await tab.click('[data-action=open]');
  await tab.waitForTimeout(300);
  const done = await tab.locator('dialog [data-action=close]').boundingBox();
  if (!done || done.y + done.height > 600) {
    fail("the dialog's Done button is off a phone's screen");
  }
  await tab.keyboard.press('Escape');
  await tab.setViewportSize({ width: 1280, height: 720 });

  errors.forEach(error => fail(error));
  await browser.close();
  console.log(`${name}: checked ${Object.keys(routes).length + 2} pages from disk`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('The build works from disk in every browser');
