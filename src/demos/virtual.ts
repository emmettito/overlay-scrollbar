import { Bars, find, html, Page, render } from './page';
import './virtual.css';

const ROW_HEIGHT = 36;
// Rows rendered beyond each end of the view, so a fast scroll doesn't show a gap
const OVERSCAN = 5;

/**
 * A list that renders only the rows in view, out of any number. A spacer as tall as every row together gives the
 * scrollable element its full height, and the rows in view sit in a window positioned over their place in it.
 */
export class VirtualList {
  private first = -1;
  private last = -1;
  private rows: string[] = [];
  private readonly spacer: HTMLElement;
  private readonly window: HTMLElement;

  constructor(private readonly viewport: HTMLElement) {
    this.spacer = viewport.appendChild(document.createElement('div'));
    this.spacer.className = 'spacer';
    this.window = this.spacer.appendChild(document.createElement('div'));
    this.window.className = 'window';
    viewport.addEventListener('scroll', () => this.update());
  }

  public scrollToIndex(index: number): void {
    this.viewport.scrollTop = index * ROW_HEIGHT;
  }

  public setRows(rows: string[]): void {
    this.rows = rows;
    this.spacer.style.height = `${rows.length * ROW_HEIGHT}px`;
    this.first = this.last = -1;
    this.update();
  }

  private update(): void {
    const { scrollTop, clientHeight } = this.viewport;
    const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const last = Math.min(this.rows.length, Math.ceil((scrollTop + clientHeight) / ROW_HEIGHT) + OVERSCAN);
    if (first === this.first && last === this.last) {
      return;
    }
    this.first = first;
    this.last = last;
    this.window.style.top = `${first * ROW_HEIGHT}px`;
    render(this.window, html`${this.rows.slice(first, last).map(row => html`<div class="row">${row}</div>`)}`);
  }
}

const counts = [100, 10_000, 100_000];

function makeRows(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `Row ${i.toLocaleString()}`);
}

export const virtual: Page = {
  title: 'Virtual scrolling',
  render(main) {
    render(
      main,
      html`
      <div class="virtual">
        <h1>Virtual scrolling</h1>
        <p class="note">Each list renders only the rows in view, out of <span data-count></span>.</p>
        <div class="controls">
          <div class="segmented" role="group" aria-label="Rows">
            ${counts.map(n => html`<button type="button" data-rows="${n}">${n.toLocaleString()} rows</button>`)}
          </div>
          <label>Jump to row <input type="number" min="0" value="5000" /></label>
          <button type="button" class="primary" data-action="jump">Go</button>
          <label><input type="checkbox" data-action="wide" /> Wide rows</label>
        </div>
        <div class="panels">
          <section>
            <h3 class="label">Native</h3>
            <div class="list"></div>
          </section>
          <section>
            <h3 class="label">overlay-scrollbar</h3>
            <div class="list" data-lib></div>
          </section>
        </div>
      </div>
    `
    );

    const lists = [...main.querySelectorAll<HTMLElement>('.list')].map(viewport => new VirtualList(viewport));
    const bars = new Bars();
    bars.attachMarked(main);

    const setCount = (n: number): void => {
      const rows = makeRows(n);
      lists.forEach(list => list.setRows(rows));
      find(main, '[data-count]').textContent = n.toLocaleString();
      main.querySelectorAll<HTMLElement>('[data-rows]').forEach(button => {
        const on = button.dataset['rows'] === String(n);
        button.classList.toggle('on', on);
        button.setAttribute('aria-pressed', String(on));
      });
    };

    main.querySelectorAll<HTMLElement>('[data-rows]').forEach(button => {
      button.addEventListener('click', () => setCount(Number(button.dataset['rows'])));
    });
    find(main, '[data-action=jump]').addEventListener('click', () => {
      const index = find<HTMLInputElement>(main, 'input[type=number]').valueAsNumber || 0;
      lists.forEach(list => list.scrollToIndex(index));
    });
    find(main, '[data-action=wide]').addEventListener('change', event => {
      find(main, '.panels').classList.toggle('wide', (event.target as HTMLInputElement).checked);
      // The rows overflow the window sideways without resizing anything a ResizeObserver sees
      bars.update();
    });

    setCount(10_000);
    return () => bars.destroy();
  }
};
