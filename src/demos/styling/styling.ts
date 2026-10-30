import { OverlayScrollbarOptions } from '../../overlay-scrollbar/models/overlay-scrollbar-options';
import { Bars, html, Html, Page, render } from '../page';
import './customise/big-square.css';
import './customise/dark-panel.css';
import './customise/faint.css';
import './customise/layers.css';
import './customise/light-panel.css';
import './customise/slow.css';
import './styling-base.css';

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
const sources = import.meta.glob<string>('./customise/*.css', {
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
  }
];

const examples = groups.flatMap(group => group.examples);

/** Code a line at a time, for the stylesheet to number: the numbers aren't text, so copying the code leaves them out */
function codeLines(code: string): Html {
  return html`${code
    .replace(/\n$/, '')
    .split('\n')
    .map(line => html`<span class="line">${line}</span>\n`)}`;
}

/** The attach call with these options, as an app would write it. */
function optionsCode(options: OverlayScrollbarOptions): string {
  const entries = Object.entries(options).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`);
  return `attachOverlayScrollbar(element, {\n${entries.join(',\n')}\n});`;
}

/** The custom properties and options, each with the code that makes it. */
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
                  <pre><code>${codeLines(optionsCode(example.options))}</code></pre>
                `
                }
                ${
                  example.css &&
                  html`
                  <p class="caption">CSS</p>
                  <pre><code>${codeLines(sources[example.css] ?? '')}</code></pre>
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
    return () => bars.destroy();
  }
};
