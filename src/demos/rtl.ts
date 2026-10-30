import { Bars, find, html, Page, render } from './page';
import './rtl.css';

const thirty = Array.from({ length: 30 }, (_, i) => i + 1);
const twenty = Array.from({ length: 20 }, (_, i) => i + 1);

export const rtl: Page = {
  title: 'Right-to-left',
  render(main) {
    render(
      main,
      html`
      <div class="rtl">
        <h1>Right-to-left</h1>
        <p class="note">
          In right-to-left text the vertical bar sits on the left, and sideways scrolling starts from the right. The bars
          follow the direction by themselves: switch it to watch them move.
        </p>
        <div class="controls">
          <button type="button">Switch to left-to-right</button>
        </div>
        <div class="panels">
          ${[false, true].map(
            lib => html`
            <section dir="rtl">
              <h3 class="label">${lib ? 'overlay-scrollbar' : 'Native'}</h3>
              <div class="box" style="height: 260px; white-space: nowrap" ${lib && html`data-lib`}>
                ${thirty.map(i => html`<p>${i}. هذا سطر طويل بما يكفي للتمرير أفقيا أيضا — זוהי שורה ארוכה מספיק</p>`)}
              </div>
              <div class="box" style="height: 200px; margin-top: 20px" ${lib && html`data-lib`}>
                ${twenty.map(i => html`<p>${i}. سطر قصير</p>`)}
              </div>
            </section>
          `
          )}
        </div>
      </div>
    `
    );

    // The bars follow the direction by themselves
    let isRtl = true;
    const button = find(main, 'button');
    button.addEventListener('click', () => {
      isRtl = !isRtl;
      main.querySelectorAll('section').forEach(section => section.setAttribute('dir', isRtl ? 'rtl' : 'ltr'));
      button.textContent = `Switch to ${isRtl ? 'left-to-right' : 'right-to-left'}`;
    });

    const bars = new Bars();
    bars.attachMarked(main);
    return () => bars.destroy();
  }
};
