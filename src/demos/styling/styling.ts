// The themes' fonts, bundled like the app's own
import '@fontsource-variable/fredoka';
import '@fontsource-variable/orbitron';
import '@fontsource/press-start-2p';
import { OverlayScrollbarOptions } from '../../overlay-scrollbar/models/overlay-scrollbar-options';
import { Bars, html, Html, Page, render } from '../page';
import './customise/big-square.css';
import './customise/dark-panel.css';
import './customise/faint.css';
import './customise/layers.css';
import './customise/light-panel.css';
import './customise/slow.css';
import './styling-base.css';
import './themes/cyberspace.css';
import './themes/peppermint.css';
import './themes/rainbow.css';
import './themes/retro.css';

interface Example {
  name: string;
  /** Classes on the scrollable element */
  className: string;
  /** The example's stylesheet, a key of `sources` */
  css?: string;
  options?: OverlayScrollbarOptions;
  /** Shown in this theme only, e.g. a dark panel in the light theme */
  theme?: 'light' | 'dark';
  rows: string[];
}

// Each example's stylesheet, as text, keyed by path (./customise/dark-panel.css)
const sources = import.meta.glob<string>(['./customise/*.css', './themes/*.css'], {
  query: '?raw',
  import: 'default',
  eager: true
});

const lines = Array.from({ length: 30 }, (_, i) => `Line ${i + 1}`);

const groups: { title: string; examples: Example[] }[] = [
  {
    title: 'Custom properties and options',
    examples: [
      { name: 'Default', className: 'lines', rows: lines },
      {
        name: 'Dark panel',
        className: 'lines dark-panel',
        css: './customise/dark-panel.css',
        theme: 'light',
        rows: lines
      },
      {
        name: 'Light panel',
        className: 'lines light-panel',
        css: './customise/light-panel.css',
        theme: 'dark',
        rows: lines
      },
      {
        name: 'Bigger and square',
        className: 'lines big-square',
        css: './customise/big-square.css',
        rows: lines
      },
      {
        name: 'Visible on hover',
        className: 'lines',
        options: { autoHide: 'leave' },
        rows: lines
      },
      {
        name: 'Always visible',
        className: 'lines',
        options: { autoHide: false },
        rows: lines
      },
      {
        name: 'Faint until used',
        className: 'lines faint-bars',
        css: './customise/faint.css',
        rows: lines
      },
      {
        name: 'Slower timings',
        className: 'lines slow-bars',
        css: './customise/slow.css',
        options: { hideAfterScroll: 2000, hideAfterLeave: 2000, hoverDelay: 400, minThumbLength: 60 },
        rows: lines
      },
      {
        name: 'Cascade layers',
        className: 'lines layered',
        css: './customise/layers.css',
        rows: lines
      }
    ]
  },
  {
    title: 'Themes',
    examples: [
      { name: 'Retro', className: 'theme-retro', css: './themes/retro.css', rows: lines },
      { name: 'Rainbow', className: 'theme-rainbow', css: './themes/rainbow.css', rows: lines },
      { name: 'Cyberspace', className: 'theme-cyberspace', css: './themes/cyberspace.css', rows: lines },
      { name: 'Peppermint', className: 'theme-peppermint', css: './themes/peppermint.css', rows: lines }
    ]
  }
];

const examples = groups.flatMap(group => group.examples);

/**
 * A code block with a gutter of a span per line, for the stylesheet to number: the numbers aren't text, so copying the
 * code leaves them out. --digits is how many the last line's number has, for the gutter's width.
 */
function codeBlock(code: string): Html {
  const lines = code.replace(/\n$/, '').split('\n');
  return html`<pre style="--digits: ${String(lines.length).length}"><code><span class="gutter" aria-hidden="true">${lines.map(
    () => html`<span></span>`
  )}</span><span class="lines">${lines.join('\n')}</span></code></pre>`;
}

/** The attach call with these options, as an app would write it. */
function optionsCode(options: OverlayScrollbarOptions): string {
  const entries = Object.entries(options).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`);
  return `attachOverlayScrollbar(element, {\n${entries.join(',\n')}\n});`;
}

/** The custom properties and options, and a few themes, each with the code that makes it. */
export const styling: Page = {
  title: 'Styling',
  render(main) {
    render(
      main,
      html`
      <h1>Styling</h1>
      <p class="note">
        Open an example's Code to see its CSS or JavaScript. Every custom property and option is listed in
        the
        <a href="https://github.com/emmettito/overlay-scrollbar/blob/main/src/overlay-scrollbar/README.md">library's README</a>.
      </p>

      ${groups.map(
        group => html`
        <h2 class="group-title">${group.title}</h2>
        <div class="examples">
          ${group.examples.map(
            example => html`
            <section class="panel" data-theme="${example.theme}">
              <h2>${example.name}</h2>
              <div class="box ${example.className}" data-example="${examples.indexOf(example)}">
                ${example.rows.map(row => html`<p>${row}</p>`)}
              </div>
              <details class="code">
                <summary>Code</summary>
                ${!example.css && !example.options && html`<p class="caption">Nothing: these are the defaults.</p>`}
                ${
                  example.options &&
                  html`
                  <p class="caption">JavaScript</p>
                  ${codeBlock(optionsCode(example.options))}
                `
                }
                ${
                  example.css &&
                  html`
                  <p class="caption">CSS</p>
                  ${codeBlock(sources[example.css] ?? '')}
                `
                }
              </details>
            </section>
          `
          )}
        </div>
      `
      )}
    `
    );

    const bars = new Bars();
    main.querySelectorAll<HTMLElement>('[data-example]').forEach(box => {
      bars.attach(box, examples[Number(box.dataset['example'])].options);
    });
    bars.attachCode(main);
    return () => bars.destroy();
  }
};
