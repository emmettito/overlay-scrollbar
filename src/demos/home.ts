import { supportsAnchorPositioning } from '../overlay-scrollbar/utilities/anchor-positioning';
import { drawsOverlayScrollbars, watchScrollbarStyle } from '../overlay-scrollbar/utilities/scrollbar-style';
import './home.css';
import { Bars, find, html, Page, render } from './page';

const repository = 'https://github.com/emmettito/overlay-scrollbar';
const readme = `${repository}/blob/main/src/overlay-scrollbar/README.md`;

const install = 'npm install @emmettito/overlay-scrollbar';

const use = `import '@emmettito/overlay-scrollbar/overlay-scrollbar.css';
import { attachOverlayScrollbar } from '@emmettito/overlay-scrollbar';

const scrollbar = attachOverlayScrollbar(element);`;

const rainbow = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];
// How long each bar takes to go down and back up, in ms
const PERIOD = 4000;

/**
 * How far down bar `index` is at `time`, as a fraction of the way: a wave moving along the bars, starting with the ends
 * at the top and the middle at the bottom. Each bar goes down and back up at a steady speed.
 */
function wave(index: number, time: number): number {
  const phase = (index / 6 + time / PERIOD) % 1;
  // A little past each end and clamped, so it rests there for a few frames rather than turning between two of them
  return Math.min(1, Math.max(0, 1.04 * (1 - Math.abs(1 - 2 * phase)) - 0.02));
}

/** Why the bars below can't show, or show although the library would leave them off; nothing otherwise */
function notice(): string | undefined {
  if (!supportsAnchorPositioning()) {
    return (
      'This browser doesn’t support CSS anchor positioning, which the library needs, so it keeps its native ' +
      'scrollbars. The demos show native scrollbars on both sides.'
    );
  }
  if (!drawsOverlayScrollbars()) {
    return (
      'This device is touch-only, so by default the library leaves its native scrollbars alone; its force option ' +
      'draws its bars here too. The boxes’ bars here and in the demos are forced on, to show them. The code blocks ' +
      'keep the default, and switch to the library’s bars when you connect a mouse or trackpad.'
    );
  }
  return undefined;
}

/** A box to try the library on, and how to use it, with a link to the library's README for the rest */
export const home: Page = {
  title: 'overlay-scrollbar',
  render(main) {
    render(
      main,
      html`
      <article class="docs">
        <h1>overlay-scrollbar</h1>
        <p class="notice" hidden></p>

        <div class="rainbow">
          ${rainbow.map(color => html`<div class="scroller ${color}"><div></div></div>`)}
        </div>

        <h2>Using the library</h2>
        <pre><code>${install}</code></pre>
        <pre><code>${use}</code></pre>
        <p>Options, theming and limits are in <a href="${readme}">the library's README</a>.</p>
      </article>
    `
    );

    // Kept up to date, as connecting a mouse or trackpad, or disconnecting it, changes whether the library draws its bars
    const noticeElement = find(main, '.notice');
    const showNotice = (): void => {
      const why = notice();
      noticeElement.hidden = !why;
      noticeElement.textContent = why ?? '';
    };
    showNotice();
    const unwatch = watchScrollbarStyle(showNotice);

    const bars = new Bars();
    const scrollers = rainbow.map(color => find(main, `.rainbow .${color}`));
    scrollers.forEach(element => bars.attach(element, { autoHide: false }));
    bars.attachCode(main);
    // Puts the bar where the wave has it, reaching each end. Far from there (just after a pause), moves `ease` of the
    // way instead, so it glides back rather than jumping.
    const place = (element: HTMLElement, index: number, time: number, ease: number): void => {
      const target = (element.scrollHeight - element.clientHeight) * wave(index, time);
      const distance = target - element.scrollTop;
      element.scrollTop = Math.abs(distance) < 4 ? target : element.scrollTop + distance * ease;
    };
    scrollers.forEach((element, index) => place(element, index, 0, 1));

    // The wave stops while the pointer is on the bars, so they can be scrolled and dragged
    let frame = 0;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const box = find(main, '.rainbow');
      let paused = false;
      box.addEventListener('pointerenter', () => (paused = true));
      box.addEventListener('pointerleave', () => (paused = false));
      let time = 0;
      let last = performance.now();
      const step = (now: number): void => {
        if (!paused) {
          time += now - last;
          scrollers.forEach((element, index) => place(element, index, time, 0.15));
        }
        last = now;
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }
    return () => {
      unwatch();
      cancelAnimationFrame(frame);
      bars.destroy();
    };
  }
};
