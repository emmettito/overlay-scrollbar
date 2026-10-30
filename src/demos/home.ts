import { supportsAnchorPositioning } from '../overlay-scrollbar/utilities/anchor-positioning';
import { drawsOverlayScrollbars } from '../overlay-scrollbar/utilities/scrollbar-style';
import './home.css';
import { Bars, find, html, Page, render } from './page';

const repository = 'https://github.com/emmettito/overlay-scrollbar';
const readme = `${repository}/blob/main/src/overlay-scrollbar/README.md`;

const install = `npm run package
npm install <path to>/overlay-scrollbar-<version>.tgz`;

const use = `import '@emmettito/overlay-scrollbar/overlay-scrollbar.css';
import { attachOverlayScrollbar } from '@emmettito/overlay-scrollbar';

const scrollbar = attachOverlayScrollbar(element);`;

const lines = Array.from({ length: 40 }, (_, i) => `Line ${i + 1}`);

/** Why the box below shows native scrollbars, where it does; nothing where it shows the library's bars */
function notice(): string | undefined {
  if (!supportsAnchorPositioning()) {
    return (
      'This browser doesn’t support CSS anchor positioning, which the library needs, so it keeps its native ' +
      'scrollbars. The demos show native scrollbars on both sides.'
    );
  }
  if (!drawsOverlayScrollbars()) {
    return (
      'On a touch-only device the library leaves the native scrollbars alone, so the box below keeps them. The demos ' +
      'draw the library’s bars anyway, to compare.'
    );
  }
  return undefined;
}

/** A box to try the library on, and how to use it, with a link to the library's README for the rest */
export const home: Page = {
  title: 'overlay-scrollbar',
  render(main) {
    const why = notice();
    render(
      main,
      html`
      <article class="docs">
        <h1>overlay-scrollbar</h1>
        ${why && html`<p class="notice">${why}</p>`}

        <h2>Try it</h2>
        <p>
          Scroll this box. Scrolling is the browser's own; the bars are drawn by the library. By default they're thin,
          widen when the pointer rests on them, and fade out shortly after scrolling stops.
        </p>
        <div class="try">${lines.map(line => html`<p>${line}</p>`)}</div>

        <h2>Using the library</h2>
        <p>
          The package isn't on npm. Build it from <a href="${repository}">this repository</a>, then install the file it
          writes:
        </p>
        <pre><code>${install}</code></pre>
        <pre><code>${use}</code></pre>
        <p>Options, theming and limits are in <a href="${readme}">the library's README</a>.</p>
      </article>
    `
    );

    // Not forced on, unlike the demos' library columns, so the box shows what the status line says
    const bars = new Bars();
    bars.attach(find(main, '.try'), { force: false });
    return () => bars.destroy();
  }
};
