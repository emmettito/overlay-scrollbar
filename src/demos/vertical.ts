import { Bars, find, html, Page, render } from './page';
import './vertical.css';

const forty = Array.from({ length: 40 }, (_, i) => i + 1);
const modes = ['vertical-rl', 'vertical-lr', 'sideways-rl', 'sideways-lr', 'horizontal-tb'];

export const vertical: Page = {
  title: 'Vertical text',
  render(main) {
    render(
      main,
      html`
      <div class="vertical">
        <h1>Vertical text</h1>
        <p class="note">
          In vertical text, as in Japanese or Chinese, each line runs top to bottom and the lines stack sideways: right to
          left in vertical-rl, so sideways scrolling starts from the right. The bars stay on the right and bottom, where
          browsers put their own, and each thumb starts where its content does. Pick a writing mode, or switch the
          direction, to watch them move.
        </p>
        <div class="controls">
          <div class="segmented" role="group" aria-label="Writing mode">
            ${modes.map(mode => html`<button type="button" data-mode="${mode}">${mode}</button>`)}
          </div>
          <button type="button" data-action="direction">Switch to right-to-left</button>
        </div>
        <div class="panels">
          ${[false, true].map(
            lib => html`
            <section>
              <h3 class="label">${lib ? 'overlay-scrollbar' : 'Native'}</h3>
              <div class="box" lang="ja" ${lib && html`data-lib`}>
                ${forty.map(i => html`<p>${i}. 吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。</p>`)}
              </div>
            </section>
          `
          )}
        </div>
      </div>
    `
    );

    const boxes = [...main.querySelectorAll<HTMLElement>('.box')];
    const bars = new Bars();
    bars.attachMarked(main);

    // A change of writing mode alone doesn't resize the element: update() measures it again at once, rather than when
    // the pointer next comes onto the bars
    const setMode = (mode: string): void => {
      boxes.forEach(box => (box.style.writingMode = mode));
      main.querySelectorAll<HTMLElement>('[data-mode]').forEach(button => {
        const on = button.dataset['mode'] === mode;
        button.classList.toggle('on', on);
        button.setAttribute('aria-pressed', String(on));
      });
      bars.update();
    };
    main.querySelectorAll<HTMLElement>('[data-mode]').forEach(button => {
      button.addEventListener('click', () => setMode(button.dataset['mode'] ?? 'vertical-rl'));
    });
    setMode('vertical-rl');

    // The bars follow a dir attribute changing by themselves
    let isRtl = false;
    const directionButton = find(main, '[data-action=direction]');
    directionButton.addEventListener('click', () => {
      isRtl = !isRtl;
      boxes.forEach(box => box.setAttribute('dir', isRtl ? 'rtl' : 'ltr'));
      directionButton.textContent = `Switch to ${isRtl ? 'left-to-right' : 'right-to-left'}`;
    });

    return () => bars.destroy();
  }
};
