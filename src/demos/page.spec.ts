import { Bars, Html, html, render } from './page';

describe('html', () => {
  it('escapes every value, so text never becomes markup', () => {
    const value = `<img src=x onerror="alert('hi')"> & more`;
    expect(html`<p title="${value}">${value}</p>`.value).toBe(
      '<p title="&#60;img src=x onerror=&#34;alert(&#39;hi&#39;)&#34;&#62; &#38; more">' +
        '&#60;img src=x onerror=&#34;alert(&#39;hi&#39;)&#34;&#62; &#38; more</p>'
    );
  });

  it('inserts nested markup as it is, and joins arrays', () => {
    const items = ['a', '<b>'].map(item => html`<li>${item}</li>`);
    expect(html`<ul>${items}</ul>`.value).toBe('<ul><li>a</li><li>&#60;b&#62;</li></ul>');
  });

  it('leaves out null, undefined and false, but not 0 or empty strings', () => {
    expect(html`[${null}${undefined}${false}${0}${''}]`.value).toBe('[0]');
  });

  it('renders into an element', () => {
    const element = document.createElement('div');
    render(element, html`<b>${'<i>'}</b>`);
    expect(element.innerHTML).toBe('<b>&lt;i&gt;</b>');
    expect(new Html('x').toString()).toBe('x');
  });
});

describe('Bars', () => {
  it('attaches the library, forced on, to the elements marked data-lib, and destroys them all', () => {
    const root = document.body.appendChild(document.createElement('div'));
    root.innerHTML = '<div data-lib style="overflow-y: auto"></div><div style="overflow-y: auto"></div>';
    const bars = new Bars();
    // jsdom has no fine pointer, like a phone, so only forcing the bars on draws them
    bars.attachMarked(root);
    expect(root.querySelectorAll('.overlay-scrollbar-frame')).toHaveLength(1);
    expect(root.firstElementChild?.nextElementSibling?.classList).toContain('overlay-scrollbar-frame');

    bars.destroy();
    expect(root.querySelector('.overlay-scrollbar-frame')).toBeNull();
    // Destroying again does nothing
    expect(() => bars.destroy()).not.toThrow();
    root.remove();
  });
});
