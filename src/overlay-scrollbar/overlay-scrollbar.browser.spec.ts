// What an app includes in its global styles
import { OverlayScrollbarRef } from './models/overlay-scrollbar-ref.js';
import './overlay-scrollbar.css';
import { attachOverlayScrollbar } from './overlay-scrollbar.js';
import { thumbsUseScrollTimeline } from './utilities/thumbs-use-scroll-timeline.js';

// Real layout, in Chromium, WebKit and Firefox (vitest.browser.config.mts). Chromium moves the thumbs with
// scroll-driven animations and the others with a scroll listener, so positions are checked in all three.

// Scroll events, ResizeObserver callbacks and scroll-driven animations all land within a couple of frames
const frames = (count = 3): Promise<void> =>
  new Promise(resolve => {
    const next = (left: number): void => {
      if (left) {
        requestAnimationFrame(() => next(left - 1));
      } else {
        resolve();
      }
    };
    next(count);
  });

const tall = '<div style="height: 1000px"></div>';
const tallAndWide = '<div style="width: 1000px; height: 1000px"></div>';

describe('overlay scrollbars in a real browser', () => {
  const refs: OverlayScrollbarRef[] = [];
  const hosts: HTMLElement[] = [];

  function attach(content: string, style = '', options = {}): HTMLElement {
    const host = document.createElement('div');
    host.style.cssText = `width: 200px; height: 150px; overflow: auto; ${style}`;
    host.innerHTML = content;
    document.body.appendChild(host);
    hosts.push(host);
    refs.push(attachOverlayScrollbar(host, { force: true, ...options }));
    return host;
  }

  const part = (host: HTMLElement, selector: string): HTMLElement =>
    (host.nextElementSibling as HTMLElement).querySelector(selector) as HTMLElement;
  const rect = (host: HTMLElement, selector: string): DOMRect => part(host, selector).getBoundingClientRect();

  afterEach(() => {
    refs.splice(0).forEach(ref => ref.destroy());
    hosts.splice(0).forEach(host => host.remove());
    document.querySelectorAll('style[data-test]').forEach(style => style.remove());
  });

  it('hides the native scrollbars', async () => {
    const host = attach(tallAndWide);
    await frames();
    expect(host.offsetWidth - host.clientWidth).toBe(0);
    expect(host.offsetHeight - host.clientHeight).toBe(0);
  });

  it('keeps the bar at the visible edge, inset 3px, at both ends of the scroll range', async () => {
    // Padding moves the content, not the bars
    const host = attach(tall, 'padding: 20px; box-sizing: border-box');
    await frames();
    for (const top of [0, host.scrollHeight]) {
      host.scrollTop = top;
      await frames();
      const box = host.getBoundingClientRect();
      const bar = rect(host, '.overlay-scrollbar-bar-y');
      expect(bar.right).toBeCloseTo(box.right, 0);
      expect(bar.top).toBeCloseTo(box.top + 3, 0);
      expect(bar.bottom).toBeCloseTo(box.bottom - 3, 0);
    }
  });

  it('sizes the thumb to the visible part of the content, and moves it from end to end of the track', async () => {
    const host = attach(tall);
    await frames();
    const track = rect(host, '.overlay-scrollbar-bar-y');
    let thumb = rect(host, '.overlay-scrollbar-bar-y .overlay-scrollbar-thumb');
    expect(thumb.height).toBeCloseTo((track.height * host.clientHeight) / host.scrollHeight, 0);
    expect(thumb.top).toBeCloseTo(track.top, 0);

    host.scrollTop = (host.scrollHeight - host.clientHeight) / 2;
    await frames();
    thumb = rect(host, '.overlay-scrollbar-bar-y .overlay-scrollbar-thumb');
    expect(thumb.top - track.top).toBeCloseTo((track.height - thumb.height) / 2, 0);

    host.scrollTop = host.scrollHeight;
    await frames();
    expect(rect(host, '.overlay-scrollbar-bar-y .overlay-scrollbar-thumb').bottom).toBeCloseTo(track.bottom, 0);
  });

  it('mirrors right to left: the vertical bar on the left, the horizontal thumb starting on the right', async () => {
    const host = attach(tallAndWide, 'direction: rtl');
    await frames();
    const box = host.getBoundingClientRect();
    expect(rect(host, '.overlay-scrollbar-bar-y').left).toBeCloseTo(box.left, 0);
    const track = rect(host, '.overlay-scrollbar-bar-x');
    expect(rect(host, '.overlay-scrollbar-bar-x .overlay-scrollbar-thumb').right).toBeCloseTo(track.right, 0);

    // scrollLeft runs from 0 down to minus the range in RTL
    host.scrollLeft = -host.scrollWidth;
    await frames();
    expect(host.scrollLeft).toBeLessThan(0);
    expect(rect(host, '.overlay-scrollbar-bar-x .overlay-scrollbar-thumb').left).toBeCloseTo(track.left, 0);
  });

  it('follows a change of direction', async () => {
    const host = attach(tallAndWide);
    await frames();
    host.dir = 'rtl';
    await frames();
    const box = host.getBoundingClientRect();
    expect(rect(host, '.overlay-scrollbar-bar-y').left).toBeCloseTo(box.left, 0);
    const track = rect(host, '.overlay-scrollbar-bar-x');
    expect(rect(host, '.overlay-scrollbar-bar-x .overlay-scrollbar-thumb').right).toBeCloseTo(track.right, 0);
  });

  it('follows the content growing and shrinking', async () => {
    const host = attach('<div style="height: 1000px"></div>');
    const content = host.firstElementChild as HTMLElement;
    await frames();
    expect(part(host, '.overlay-scrollbar-bar-y').hidden).toBe(false);

    // The layer is as big as the scrollable area, so this only works because it's collapsed while measuring
    content.style.height = '100px';
    await frames();
    expect(host.scrollHeight).toBe(150);
    expect(part(host, '.overlay-scrollbar-bar-y').hidden).toBe(true);

    content.style.height = '600px';
    await frames();
    expect(part(host, '.overlay-scrollbar-bar-y').hidden).toBe(false);
  });

  it('measures again when a child added later makes the content scroll', async () => {
    const host = attach('<div style="height: 50px"></div>');
    await frames();
    expect(part(host, '.overlay-scrollbar-bar-y').hidden).toBe(true);

    host.insertAdjacentHTML('afterbegin', '<div style="height: 600px"></div>');
    await frames();
    expect(part(host, '.overlay-scrollbar-bar-y').hidden).toBe(false);
  });

  it('measures elements attached together, each correctly', async () => {
    const many = Array.from({ length: 30 }, (_, i) => attach(`<div style="height: ${300 + i * 50}px"></div>`));
    await frames();
    for (const host of many) {
      const track = rect(host, '.overlay-scrollbar-bar-y');
      expect(rect(host, '.overlay-scrollbar-bar-y .overlay-scrollbar-thumb').height).toBeCloseTo(
        Math.max(20, (track.height * host.clientHeight) / host.scrollHeight),
        0
      );
    }
  });

  it('notices content growing below its children when scrolled', async () => {
    // The child keeps its size, so the ResizeObserver doesn't see the grandchild grow
    const host = attach('<div style="height: 160px"><div style="height: 300px"></div></div>');
    await frames();
    const grandchild = host.firstElementChild?.firstElementChild as HTMLElement;
    grandchild.style.height = '600px';
    host.scrollTop = 5;
    await frames();
    const track = rect(host, '.overlay-scrollbar-bar-y');
    expect(host.scrollHeight).toBe(600);
    expect(rect(host, '.overlay-scrollbar-bar-y .overlay-scrollbar-thumb').height).toBeCloseTo(
      (track.height * 150) / 600,
      0
    );
  });

  it("gives a nested element's bar the pointer where it overlaps its parent's", async () => {
    const outer = attach(`<div style="height: 120px; overflow: auto">${tall}</div>${tall}`);
    const inner = outer.firstElementChild as HTMLElement;
    refs.push(attachOverlayScrollbar(inner, { force: true }));
    await frames();
    // Both vertical bars run down the right edge, where the inner element is flush with the outer one
    const box = inner.getBoundingClientRect();
    const hit = document.elementFromPoint(box.right - 2, box.top + 60);
    expect(hit?.closest('.overlay-scrollbar-frame')).toBe(inner.nextElementSibling);
  });

  it('shows instantly, at full opacity, on scrolling', async () => {
    const host = attach(tall);
    await frames();
    const opacity = new Promise<string>(resolve =>
      host.addEventListener('scroll', () => resolve(getComputedStyle(part(host, '.overlay-scrollbar-bar-y')).opacity), {
        once: true
      })
    );
    host.scrollTop = 50;
    expect(await opacity).toBe('1');
  });

  it('leaves room in the corner for each other with autoHide off', async () => {
    const host = attach(tallAndWide, '', { autoHide: false });
    await frames();
    expect(rect(host, '.overlay-scrollbar-bar-y').bottom).toBeLessThan(rect(host, '.overlay-scrollbar-bar-x').top);
    expect(rect(host, '.overlay-scrollbar-bar-x').right).toBeLessThan(rect(host, '.overlay-scrollbar-bar-y').left);

    // The thumbs still reach the ends of their shorter tracks
    host.scrollTop = host.scrollHeight;
    host.scrollLeft = host.scrollWidth;
    await frames();
    expect(rect(host, '.overlay-scrollbar-bar-y .overlay-scrollbar-thumb').bottom).toBeCloseTo(
      rect(host, '.overlay-scrollbar-bar-y').bottom,
      0
    );
    expect(rect(host, '.overlay-scrollbar-bar-x .overlay-scrollbar-thumb').right).toBeCloseTo(
      rect(host, '.overlay-scrollbar-bar-x').right,
      0
    );
  });

  it("lets the page's own styles override the library's, even from a cascade layer", async () => {
    const style = document.createElement('style');
    style.dataset['test'] = '';
    style.textContent =
      '@layer later { .themed + .overlay-scrollbar-frame .overlay-scrollbar-thumb { background-color: rgb(255, 0, 0); } }';
    document.head.appendChild(style);
    const host = attach(tall, '', {});
    host.classList.add('themed');
    await frames();
    expect(getComputedStyle(part(host, '.overlay-scrollbar-bar-y .overlay-scrollbar-thumb')).backgroundColor).toBe(
      'rgb(255, 0, 0)'
    );
  });

  it('takes its sizes from the custom properties', async () => {
    const host = attach(tall, '--overlay-scrollbar-width: 10px; --overlay-scrollbar-inset: 8px');
    await frames();
    const box = host.getBoundingClientRect();
    expect(rect(host, '.overlay-scrollbar-bar-y .overlay-scrollbar-thumb').width).toBe(10);
    expect(rect(host, '.overlay-scrollbar-bar-y').top).toBeCloseTo(box.top + 8, 0);
  });

  it('takes the custom properties from a class on the element, though the frame is outside it', async () => {
    const style = document.createElement('style');
    style.dataset['test'] = '';
    style.textContent = '.wide-thumbs { --overlay-scrollbar-width: 9px; }';
    document.head.appendChild(style);
    const host = attach(tall);
    host.classList.add('wide-thumbs');
    refs[0].update();
    await frames();
    expect(rect(host, '.overlay-scrollbar-bar-y .overlay-scrollbar-thumb').width).toBe(9);
  });

  it("lays the frame over the element's visible area, inside its border, and keeps it there while scrolling", async () => {
    const host = attach(tallAndWide, 'border: 4px solid; border-top-width: 7px; margin: 10px');
    await frames();
    for (const top of [0, 300]) {
      host.scrollTop = top;
      await frames();
      const box = host.getBoundingClientRect();
      const frame = (host.nextElementSibling as HTMLElement).getBoundingClientRect();
      expect(frame.top).toBeCloseTo(box.top + 7, 0);
      expect(frame.left).toBeCloseTo(box.left + 4, 0);
      expect(frame.width).toBeCloseTo(host.clientWidth, 0);
      expect(frame.height).toBeCloseTo(host.clientHeight, 0);
    }
  });

  it("adds to the element's own anchor names, and leaves them when destroyed", async () => {
    const host = attach(tall, 'anchor-name: --page-anchor');
    await frames();
    expect(host.style.getPropertyValue('anchor-name')).toMatch(/^--page-anchor, --overlay-scrollbar-frame-\d+$/);
    refs.splice(0).forEach(ref => ref.destroy());
    expect(host.style.getPropertyValue('anchor-name')).toBe('--page-anchor');
  });

  it("shares the parent's timeline scope between sibling elements in Chromium, taking out only its own names", async () => {
    const first = attach(tall);
    const second = attach(tall);
    await frames();
    const scope = (): string => document.body.style.getPropertyValue('timeline-scope');
    if (!thumbsUseScrollTimeline()) {
      // The thumbs follow a scroll listener instead
      expect(scope()).toBe('');
      return;
    }
    expect(scope().split(', ')).toHaveLength(4);
    refs.shift()?.destroy();
    expect(scope().split(', ')).toHaveLength(2);
    expect(first.style.getPropertyValue('scroll-timeline-name')).toBe('');
    expect(scope()).toContain(second.style.getPropertyValue('scroll-timeline-name').split(', ')[0]);
    refs.shift()?.destroy();
    expect(scope()).toBe('');
  });

  it("leaves no copy of the stylesheet's timeline scope on the parent once its last child's bars go", async () => {
    const style = document.createElement('style');
    style.dataset['test'] = '';
    style.textContent = '.scoped { timeline-scope: --page-timeline; }';
    document.head.appendChild(style);
    const parent = document.createElement('div');
    parent.className = 'scoped';
    document.body.appendChild(parent);
    hosts.push(parent);
    const host = document.createElement('div');
    host.style.cssText = 'width: 200px; height: 150px; overflow: auto';
    host.innerHTML = tall;
    parent.appendChild(host);
    const ref = attachOverlayScrollbar(host, { force: true });
    await frames();
    if (thumbsUseScrollTimeline()) {
      // The stylesheet's name is kept alongside the bars' own while they're attached
      expect(parent.style.getPropertyValue('timeline-scope')).toMatch(/^--page-timeline, --overlay-scrollbar-/);
    }
    ref.destroy();
    expect(parent.style.getPropertyValue('timeline-scope')).toBe('');
    // Firefox has no timeline-scope
    if (CSS.supports('timeline-scope', 'all')) {
      expect(getComputedStyle(parent).getPropertyValue('timeline-scope')).toBe('--page-timeline');
    }
  });

  it('follows padding and border changing on an element of fixed size, whatever its box-sizing', async () => {
    for (const sizing of ['content-box', 'border-box']) {
      const host = attach(tall, `box-sizing: ${sizing}; border: 0 solid; padding: 0`);
      await frames();
      host.style.padding = '30px';
      host.style.borderWidth = '20px';
      await frames();
      // The frame covers the padding box, inside the border
      const frame = (host.nextElementSibling as HTMLElement).getBoundingClientRect();
      const box = host.getBoundingClientRect();
      expect(frame.width).toBeCloseTo(host.clientWidth, 0);
      expect(frame.height).toBeCloseTo(host.clientHeight, 0);
      expect(frame.top - box.top).toBeCloseTo(20, 0);
      expect(frame.left - box.left).toBeCloseTo(20, 0);
    }
  });

  it('hides a bar once removing children leaves nothing to scroll', async () => {
    const host = attach('<div style="height: 100px"></div>'.repeat(10), '', { autoHide: false });
    await frames();
    expect(part(host, '.overlay-scrollbar-bar-y').hidden).toBe(false);
    while (host.children.length > 1) {
      host.lastElementChild?.remove();
    }
    await frames();
    expect(part(host, '.overlay-scrollbar-bar-y').hidden).toBe(true);
  });

  it("follows the page's own timeline axes in step with its names, repeating them as CSS does", async () => {
    const style = document.createElement('style');
    style.dataset['test'] = '';
    style.textContent = '.two-timelines { scroll-timeline-name: --a, --b; }';
    document.head.appendChild(style);
    const host = attach(tallAndWide, '', {});
    host.classList.add('two-timelines');
    refs.splice(0).forEach(ref => ref.destroy());
    refs.push(attachOverlayScrollbar(host, { force: true }));
    await frames();
    if (!thumbsUseScrollTimeline()) {
      return;
    }
    // The page's two names, one axis each, then the bars' own x and y
    expect(host.style.getPropertyValue('scroll-timeline-axis')).toBe('block, block, x, y');
    // Scrolling only down leaves the horizontal thumb at its start
    host.scrollTop = host.scrollHeight;
    await frames();
    expect(rect(host, '.overlay-scrollbar-bar-x .overlay-scrollbar-thumb').left).toBeCloseTo(
      rect(host, '.overlay-scrollbar-bar-x').left,
      0
    );
  });

  describe('nested in an element whose bars were measured already', () => {
    // A code block: text only, no element children to report a resize, and no size change when its native scrollbars
    // are hidden (as with overlay scrollbars on macOS), so only a first notification of its own measures it
    function nest(): { outer: HTMLElement; inner: HTMLElement } {
      const outer = attach('<div style="height: 1000px"></div>', 'width: 300px; height: 200px');
      const inner = document.createElement('pre');
      inner.style.cssText = 'width: 150px; height: 100px; margin: 0; overflow: auto; scrollbar-width: none';
      inner.textContent = Array.from({ length: 60 }, (_, line) => `line ${line}`).join('\n');
      outer.prepend(inner);
      return { outer, inner };
    }

    it('measures one attached later', async () => {
      const { inner } = nest();
      await frames();
      refs.push(attachOverlayScrollbar(inner, { force: true }));
      await frames();
      expect(part(inner, '.overlay-scrollbar-bar-y').hidden).toBe(false);
    });

    it('measures one attached again, as a framework wrapper does when its options change', async () => {
      const { inner } = nest();
      attachOverlayScrollbar(inner, { force: true });
      await frames();
      refs.push(attachOverlayScrollbar(inner, { force: true, autoHide: false }));
      await frames();
      expect(part(inner, '.overlay-scrollbar-bar-y').hidden).toBe(false);
      expect(part(inner, '.overlay-scrollbar-bar-y').classList).toContain('overlay-scrollbar-visible');
    });
  });

  it('draws the bars on an element attached before it is in the page, once it is added', async () => {
    const host = document.createElement('div');
    host.style.cssText = 'width: 200px; height: 150px; overflow: auto';
    host.innerHTML = tall;
    refs.push(attachOverlayScrollbar(host, { force: true }));
    document.body.appendChild(host);
    hosts.push(host);
    await frames();
    expect(host.offsetWidth - host.clientWidth).toBe(0);
    expect(part(host, '.overlay-scrollbar-bar-y').hidden).toBe(false);
    expect(rect(host, '.overlay-scrollbar-thumb').height).toBeGreaterThan(0);
  });

  describe('nested in another element with bars', () => {
    // The outer element with its own style left unpositioned: the stylesheet positions it. The nested one starts 100px
    // down, so its lower part is out of sight.
    function attachNested(innerHeight: number): { outer: HTMLElement; inner: HTMLElement } {
      const outer = attach('<div style="height: 100px"></div>', 'height: 150px');
      const inner = document.createElement('div');
      inner.style.cssText = `width: 150px; height: ${innerHeight}px; overflow: auto`;
      inner.innerHTML = tall;
      outer.append(inner);
      outer.insertAdjacentHTML('beforeend', tall);
      refs.push(attachOverlayScrollbar(inner, { force: true }));
      return { outer, inner };
    }

    it("keeps the nested element's bars inside it, when the nested one is partly scrolled out of sight", async () => {
      const { outer, inner } = attachNested(100);
      await frames();
      const box = outer.getBoundingClientRect();
      const nestedBar = rect(inner, '.overlay-scrollbar-bar-y');
      expect(nestedBar.bottom).toBeGreaterThan(box.bottom);
      const below = document.elementFromPoint(nestedBar.left + 2, box.bottom + 10);
      expect(below?.closest('.overlay-scrollbar-frame')).toBeNull();
    });

    it('follows the nested element resizing, also once the outer bars are gone', async () => {
      const { inner } = attachNested(100);
      await frames();
      inner.style.height = '120px';
      await frames();
      expect(part(inner, '.overlay-scrollbar-bar-y').parentElement?.getBoundingClientRect().height).toBeCloseTo(120, 0);

      // The outer element's bars, attached first
      refs.shift()?.destroy();
      inner.style.height = '90px';
      await frames();
      expect(part(inner, '.overlay-scrollbar-bar-y').parentElement?.getBoundingClientRect().height).toBeCloseTo(90, 0);
    });
  });
});
