import './nested.css';
import { Bars, find, html, Html, Page, render } from './page';

const six = [1, 2, 3, 4, 5, 6];
const twelve = Array.from({ length: 12 }, (_, i) => i + 1);
const twenty = Array.from({ length: 20 }, (_, i) => i + 1);

/** One column: the same nested boxes, with or without the library */
function column(lib: boolean): Html {
  const marked = lib ? html`data-lib` : html``;
  return html`
    <div class="box outer" ${marked}>
      ${six.map(i => html`<p>Outer row ${i}</p>`)}
      <h3>Vertical</h3>
      <div class="box inner" style="height: 160px" ${marked}>
        ${twenty.map(i => html`<p>Inner row ${i}</p>`)}
      </div>
      ${six.map(i => html`<p>Outer row ${i + 6}</p>`)}
      <h3>Both ways</h3>
      <div class="box inner wide" style="height: 160px" ${marked}>
        ${twenty.map(i => html`<p>Inner row ${i}, wide enough to scroll sideways as well</p>`)}
      </div>
      <h3>Three levels deep</h3>
      <div class="box inner" style="height: 220px" ${marked}>
        <p>Level 2, top</p>
        <div class="box inner" style="height: 90px; margin: 10px var(--pad)" ${marked}>
          ${twelve.map(i => html`<p>Level 3 row ${i}</p>`)}
        </div>
        ${six.map(() => html`<p>Level 2</p>`)}
      </div>
      ${six.map(i => html`<p>Outer row ${i + 12}</p>`)}
    </div>
  `;
}

export const nested: Page = {
  title: 'Nested scroll areas',
  render(main) {
    render(
      main,
      html`
      <div class="nested">
        <h1>Nested scroll areas</h1>
        <p class="note">
          Scroll areas inside scroll areas, up to three levels deep, some scrolling both ways. Each box's bars stay inside
          the box around it. The slider sets the space on either side of the inner boxes.
        </p>
        <div class="controls">
          <label>
            Inner box margin
            <input type="range" min="0" max="32" value="0" />
            <span data-pad>0px</span>
          </label>
        </div>
        <div class="panels" style="--pad: 0px">
          <section><h3 class="label">Native</h3>${column(false)}</section>
          <section><h3 class="label">overlay-scrollbar</h3>${column(true)}</section>
        </div>
      </div>
    `
    );

    const panels = find<HTMLElement>(main, '.panels');
    const label = find(main, '[data-pad]');
    find<HTMLInputElement>(main, 'input[type=range]').addEventListener('input', event => {
      const slider = event.target as HTMLInputElement;
      const pad = `${slider.value}px`;
      slider.style.setProperty('--fill', `${(Number(slider.value) / Number(slider.max)) * 100}%`);
      panels.style.setProperty('--pad', pad);
      label.textContent = pad;
    });

    const bars = new Bars();
    bars.attachMarked(main);
    return () => bars.destroy();
  }
};
