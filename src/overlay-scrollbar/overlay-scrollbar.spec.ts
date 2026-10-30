import type { Mock } from 'vitest';
import { OverlayScrollbarRef } from './models/overlay-scrollbar-ref.js';
import { attachOverlayScrollbar, autoAttachOverlayScrollbars } from './overlay-scrollbar.js';
import { drawsOverlayScrollbars } from './utilities/scrollbar-style.js';

// jsdom has no layout, so the scroller's sizes and scroll position are set by hand
function createScroller(): HTMLElement {
  const element = document.createElement('div');
  // jsdom doesn't expand the overflow shorthand in computed styles
  element.style.overflowX = 'auto';
  element.style.overflowY = 'auto';
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: 100 },
    clientWidth: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 500 },
    scrollWidth: { configurable: true, value: 100 },
    scrollTop: { configurable: true, writable: true, value: 0 },
    scrollLeft: { configurable: true, writable: true, value: 0 }
  });
  document.body.appendChild(element);
  return element;
}

// The frame the bars are drawn in, right after the element
function frameOf(element: HTMLElement): HTMLElement | null {
  const next = element.nextElementSibling as HTMLElement | null;
  return next?.classList.contains('overlay-scrollbar-frame') ? next : null;
}

// The one ResizeObserver every attached element shares (vitest-setup.ts's stand-in), found as the one watching `element`
interface ResizeObserverStandIn {
  observe: Mock;
  unobserve: Mock;
  resize(entries: Partial<ResizeObserverEntry>[]): void;
}
function sharedResizeObserver(element: Element): ResizeObserverStandIn {
  const instances = (ResizeObserver as unknown as { instances: ResizeObserverStandIn[] }).instances;
  const observer = instances.find(instance => instance.observe.mock.calls.some(([target]) => target === element));
  if (!observer) {
    throw new Error('No ResizeObserver is watching the element');
  }
  return observer;
}

// MutationObserver callbacks run in a microtask
const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

function scrollTo(element: HTMLElement, top: number): void {
  element.scrollTop = top;
  element.dispatchEvent(new Event('scroll'));
}

describe('attachOverlayScrollbar', () => {
  let host: HTMLElement;
  let ref: OverlayScrollbarRef;

  beforeEach(() => {
    host = createScroller();
  });

  afterEach(() => {
    ref?.destroy();
    host.remove();
    vi.useRealTimers();
  });

  it('draws nothing on touch-only devices whose scrollbars overlay the content', () => {
    // jsdom has no fine pointer and its scrollbars take no space, like a phone
    expect(drawsOverlayScrollbars()).toBe(false);
    ref = attachOverlayScrollbar(host);
    expect(frameOf(host)).toBeNull();
    expect(host.classList).not.toContain('overlay-scrollbar-host');
  });

  it('leaves nothing in the page once the last bars are destroyed, not even the scrollbar style probe', () => {
    const before = document.body.children.length;
    const other = createScroller();
    ref = attachOverlayScrollbar(host);
    const otherRef = attachOverlayScrollbar(other);
    // The probe that watches for the platform switching scrollbar style
    expect(document.body.children.length).toBe(before + 2);
    ref.destroy();
    expect(document.body.children.length).toBe(before + 2);
    otherRef.destroy();
    other.remove();
    expect(document.body.children.length).toBe(before);
  });

  it('draws the bars, hiding the native scrollbar, and cleans up on destroy', () => {
    ref = attachOverlayScrollbar(host, { force: true });
    // What the ResizeObserver's first notification does once the element has rendered (jsdom never sends one)
    ref.update();
    expect(frameOf(host)?.getAttribute('aria-hidden')).toBe('true');
    expect(host.classList).toContain('overlay-scrollbar-host');
    expect(host.style.getPropertyValue('scrollbar-width')).toBe('none');
    expect((frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement).hidden).toBe(false);
    expect((frameOf(host)?.querySelector('.overlay-scrollbar-bar-x') as HTMLElement).hidden).toBe(true);

    ref.destroy();
    expect(frameOf(host)).toBeNull();
    expect(host.classList).not.toContain('overlay-scrollbar-host');
    expect(host.style.getPropertyValue('scrollbar-width')).toBe('');
  });

  it('replaces the bars when attached again, so destroying either leaves the element as it was', () => {
    const first = attachOverlayScrollbar(host, { force: true });
    ref = attachOverlayScrollbar(host, { force: true, autoHide: false });
    expect(document.querySelectorAll('.overlay-scrollbar-frame')).toHaveLength(1);
    expect(frameOf(host)?.classList).toContain('overlay-scrollbar-always');

    // The replaced bars are already gone, so this leaves the new ones alone
    first.destroy();
    expect(frameOf(host)).not.toBeNull();
    expect(host.classList).toContain('overlay-scrollbar-host');
    expect(host.style.getPropertyValue('scrollbar-width')).toBe('none');

    ref.destroy();
    expect(frameOf(host)).toBeNull();
    expect(host.style.getPropertyValue('scrollbar-width')).toBe('');
  });

  it('draws the bars on an element attached before it is in the page, once it is added', async () => {
    host.remove();
    ref = attachOverlayScrollbar(host, { force: true });
    // Nothing yet, so it keeps its own scrollbars meanwhile
    expect(host.classList).not.toContain('overlay-scrollbar-host');
    expect(host.style.getPropertyValue('scrollbar-width')).toBe('');

    document.body.appendChild(host);
    await settle();
    expect(frameOf(host)).not.toBeNull();
    expect(host.classList).toContain('overlay-scrollbar-host');
  });

  it("draws nothing for an element destroyed before it's added to the page", async () => {
    host.remove();
    attachOverlayScrollbar(host, { force: true }).destroy();
    document.body.appendChild(host);
    await settle();
    expect(frameOf(host)).toBeNull();
  });

  it("works from a script in the <head>, before there's a body", async () => {
    host.remove();
    const body = document.body;
    body.remove();
    try {
      // Without force, attaching watches the scrollbar style with a probe, which then goes in the root element
      ref = attachOverlayScrollbar(host);
      host.className = 'scroll';
      const stop = autoAttachOverlayScrollbars('.scroll', undefined, { force: true });

      document.documentElement.appendChild(body);
      body.appendChild(host);
      await settle();
      expect(frameOf(host)).not.toBeNull();
      stop();
    } finally {
      if (!body.isConnected) {
        document.documentElement.appendChild(body);
      }
    }
  });

  it('does nothing on the body while its scrolling is the page, but treats a body that scrolls by itself as any element', () => {
    ref = attachOverlayScrollbar(document.body, { force: true });
    expect(document.body.classList).not.toContain('overlay-scrollbar-host');
    ref.destroy();

    // With the root's overflow hidden, the body's own overflow applies to the body
    document.documentElement.style.overflowX = 'hidden';
    document.documentElement.style.overflowY = 'hidden';
    ref = attachOverlayScrollbar(document.body, { force: true });
    expect(document.body.classList).toContain('overlay-scrollbar-host');
    ref.destroy();
    document.documentElement.style.removeProperty('overflow-x');
    document.documentElement.style.removeProperty('overflow-y');
  });

  it('draws the bars on an element attached before it is added inside a shadow root', async () => {
    host.remove();
    const shadowHost = document.body.appendChild(document.createElement('div'));
    const shadow = shadowHost.attachShadow({ mode: 'open' });
    ref = attachOverlayScrollbar(host, { force: true });
    shadow.appendChild(host);
    // No observer reaches inside a shadow root: the check every frame finds it
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    expect(frameOf(host)).not.toBeNull();
    ref.destroy();
    shadowHost.remove();
  });

  it('leaves nothing behind when destroyed between a change of direction and its measurement', async () => {
    ref = attachOverlayScrollbar(host, { force: true });
    document.documentElement.dir = 'rtl';
    // The direction observer has run, and queued the measurement
    await Promise.resolve();
    ref.destroy();
    await settle();
    expect(host.style.getPropertyValue('anchor-name')).toBe('');
    document.documentElement.removeAttribute('dir');
  });

  it('measures again when text directly in the element changes, which reports no resize of its own', async () => {
    host.textContent = 'A long text';
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    const bar = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;
    expect(bar.hidden).toBe(false);

    // Shorter text, which no longer scrolls
    Object.defineProperty(host, 'scrollHeight', { configurable: true, value: 100 });
    host.textContent = 'Short';
    await settle();
    expect(bar.hidden).toBe(true);
  });

  it('does nothing on the root element, whose scrolling is the page', () => {
    expect(() => attachOverlayScrollbar(document.documentElement, { force: true }).destroy()).not.toThrow();
    expect(document.documentElement.classList).not.toContain('overlay-scrollbar-host');
  });

  it('numbers its frames from a count every copy of the library on the page shares, so their names never clash', () => {
    // What another copy of the library would see and add to
    const shared = globalThis as typeof globalThis & Record<symbol, number | undefined>;
    const frameCount = Symbol.for('@emmettito/overlay-scrollbar.frameCount');
    const before = shared[frameCount] ?? 0;
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    expect(shared[frameCount]).toBe(before + 1);
    expect(host.style.getPropertyValue('anchor-name')).toBe(`--overlay-scrollbar-frame-${before + 1}`);
  });

  it("puts back the element's own inline scrollbar-width and the stylesheet's names on destroy", () => {
    const style = document.createElement('style');
    style.textContent = '.tooltip-anchor { anchor-name: --tip; }';
    document.head.appendChild(style);
    host.classList.add('tooltip-anchor');
    host.style.setProperty('scrollbar-width', 'thin');
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    // The stylesheet's name is kept alongside the bars' own while they're attached
    expect(host.style.getPropertyValue('anchor-name')).toMatch(/^--tip, --overlay-scrollbar-frame-\d+$/);

    ref.destroy();
    host.classList.remove('tooltip-anchor');
    expect(host.style.getPropertyValue('scrollbar-width')).toBe('thin');
    expect(host.style.getPropertyValue('anchor-name')).toBe('');
    style.remove();
  });

  it('shows the bar on scroll and fades it out 0.7s after scrolling stops', () => {
    vi.useFakeTimers();
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    const bar = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;

    scrollTo(host, 50);
    expect(bar.classList).toContain('overlay-scrollbar-visible');
    expect(bar.classList).not.toContain('overlay-scrollbar-expanded');

    vi.advanceTimersByTime(699);
    expect(bar.classList).toContain('overlay-scrollbar-visible');
    vi.advanceTimersByTime(1);
    expect(bar.classList).not.toContain('overlay-scrollbar-visible');
  });

  it('shows the bar for a scroll that comes with a change in content size, e.g. a chat log scrolling to new messages', () => {
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    const bar = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;

    Object.defineProperty(host, 'scrollHeight', { configurable: true, value: 800 });
    scrollTo(host, 700);
    expect(bar.classList).toContain('overlay-scrollbar-visible');
  });

  it('expands the bar only once the pointer has stayed on it', () => {
    vi.useFakeTimers();
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    const bar = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;

    // Passing over the bar does nothing
    bar.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(40);
    bar.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(100);
    expect(bar.classList).not.toContain('overlay-scrollbar-visible');

    // Staying on it shows it expanded
    bar.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(80);
    expect(bar.classList).toContain('overlay-scrollbar-visible');
    expect(bar.classList).toContain('overlay-scrollbar-expanded');

    // After leaving, it stays for 0.5s, then fades out while still expanded
    bar.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(499);
    expect(bar.classList).toContain('overlay-scrollbar-visible');
    vi.advanceTimersByTime(1);
    expect(bar.classList).not.toContain('overlay-scrollbar-visible');
    expect(bar.classList).toContain('overlay-scrollbar-expanded');

    // Scrolling brings it back thin
    scrollTo(host, 50);
    expect(bar.classList).toContain('overlay-scrollbar-visible');
    expect(bar.classList).not.toContain('overlay-scrollbar-expanded');
  });

  it('takes its timings from the options', () => {
    vi.useFakeTimers();
    ref = attachOverlayScrollbar(host, { force: true, hoverDelay: 200, hideAfterScroll: 100, hideAfterLeave: 50 });
    ref.update();
    const bar = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;

    scrollTo(host, 50);
    vi.advanceTimersByTime(100);
    expect(bar.classList).not.toContain('overlay-scrollbar-visible');

    bar.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(199);
    expect(bar.classList).not.toContain('overlay-scrollbar-expanded');
    vi.advanceTimersByTime(1);
    expect(bar.classList).toContain('overlay-scrollbar-expanded');

    bar.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(50);
    expect(bar.classList).not.toContain('overlay-scrollbar-visible');
  });

  it('keeps the bars showing with autoHide off, shrinking back when the pointer leaves', () => {
    vi.useFakeTimers();
    ref = attachOverlayScrollbar(host, { force: true, autoHide: false });
    ref.update();
    const barY = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;
    const barX = frameOf(host)?.querySelector('.overlay-scrollbar-bar-x') as HTMLElement;
    expect(barY.classList).toContain('overlay-scrollbar-visible');
    // Only bars that can scroll
    expect(barX.classList).not.toContain('overlay-scrollbar-visible');

    scrollTo(host, 50);
    vi.advanceTimersByTime(5000);
    expect(barY.classList).toContain('overlay-scrollbar-visible');

    barY.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    vi.advanceTimersByTime(80);
    expect(barY.classList).toContain('overlay-scrollbar-expanded');
    barY.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(barY.classList).not.toContain('overlay-scrollbar-expanded');
    vi.advanceTimersByTime(5000);
    expect(barY.classList).toContain('overlay-scrollbar-visible');
  });

  it('puts the bar in use in front of the other', () => {
    Object.defineProperty(host, 'scrollWidth', { configurable: true, value: 500 });
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    const barX = frameOf(host)?.querySelector('.overlay-scrollbar-bar-x') as HTMLElement;
    const barY = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;
    expect(frameOf(host)?.classList).toContain('overlay-scrollbar-both');

    scrollTo(host, 50);
    expect(barY.classList).toContain('overlay-scrollbar-front');
    expect(barX.classList).not.toContain('overlay-scrollbar-front');

    // Pressing the track pages, which jsdom can't do
    Object.defineProperty(host, 'scrollBy', { configurable: true, value: () => undefined });
    barX.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
    expect(barX.classList).toContain('overlay-scrollbar-front');
    expect(barY.classList).not.toContain('overlay-scrollbar-front');
  });

  it('marks the frame so the bars leave room in the corner only with autoHide off', () => {
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    expect(frameOf(host)?.classList).not.toContain('overlay-scrollbar-always');
    // Only one bar can scroll here
    expect(frameOf(host)?.classList).not.toContain('overlay-scrollbar-both');
    ref.destroy();

    ref = attachOverlayScrollbar(host, { force: true, autoHide: false });

    ref.update();
    expect(frameOf(host)?.classList).toContain('overlay-scrollbar-always');
  });

  it('sizes the thumb no shorter than minThumbLength', () => {
    Object.defineProperty(host, 'scrollHeight', { configurable: true, value: 100_000 });
    ref = attachOverlayScrollbar(host, { force: true, minThumbLength: 40 });
    // jsdom lays out nothing, so the track gets a length by hand
    const bar = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;
    Object.defineProperty(bar, 'clientHeight', { configurable: true, value: 94 });
    ref.update();
    expect(frameOf(host)?.style.getPropertyValue('--_overlay-scrollbar-thumb-y')).toBe('40px');
  });

  it('never makes the thumb longer than a track shorter than minThumbLength', () => {
    ref = attachOverlayScrollbar(host, { force: true, minThumbLength: 40 });
    const bar = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;
    Object.defineProperty(bar, 'clientHeight', { configurable: true, value: 14 });
    ref.update();
    expect(frameOf(host)?.style.getPropertyValue('--_overlay-scrollbar-thumb-y')).toBe('14px');
  });

  it('ignores touch', () => {
    vi.useFakeTimers();
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    const bar = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;
    bar.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
    vi.advanceTimersByTime(200);
    expect(bar.classList).not.toContain('overlay-scrollbar-visible');
  });

  describe("with autoHide 'leave'", () => {
    const pointer = (type: string, init: PointerEventInit = {}): boolean =>
      host.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse', ...init }));

    it('shows the bars while the pointer is on the element, and fades them out once it leaves', () => {
      vi.useFakeTimers();
      ref = attachOverlayScrollbar(host, { force: true, autoHide: 'leave' });
      ref.update();
      const barY = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;
      const barX = frameOf(host)?.querySelector('.overlay-scrollbar-bar-x') as HTMLElement;

      pointer('pointerenter');
      expect(barY.classList).toContain('overlay-scrollbar-visible');
      expect(barY.classList).toContain('overlay-scrollbar-fade-in');
      // Scrolling and time don't hide them while the pointer stays
      scrollTo(host, 50);
      vi.advanceTimersByTime(5000);
      expect(barY.classList).toContain('overlay-scrollbar-visible');

      pointer('pointerleave');
      vi.advanceTimersByTime(499);
      expect(barY.classList).toContain('overlay-scrollbar-visible');
      vi.advanceTimersByTime(1);
      expect(barY.classList).not.toContain('overlay-scrollbar-visible');
      // A bar that can't scroll never showed, and doesn't on leaving either
      expect(barX.classList).not.toContain('overlay-scrollbar-visible');
    });

    it('shrinks a hovered bar back when the pointer leaves the bar but stays on the element', () => {
      vi.useFakeTimers();
      ref = attachOverlayScrollbar(host, { force: true, autoHide: 'leave' });
      ref.update();
      const bar = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;
      pointer('pointerenter');
      bar.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
      vi.advanceTimersByTime(80);
      expect(bar.classList).toContain('overlay-scrollbar-expanded');

      bar.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
      expect(bar.classList).not.toContain('overlay-scrollbar-expanded');
      vi.advanceTimersByTime(5000);
      expect(bar.classList).toContain('overlay-scrollbar-visible');
    });

    it('shows a bar at once when the content grows to scroll under a resting pointer, e.g. while typing', () => {
      vi.useFakeTimers();
      Object.defineProperty(host, 'scrollHeight', { configurable: true, value: 100 });
      ref = attachOverlayScrollbar(host, { force: true, autoHide: 'leave' });
      ref.update();
      const bar = frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;
      pointer('pointerenter');
      expect(bar.hidden).toBe(true);

      Object.defineProperty(host, 'scrollHeight', { configurable: true, value: 500 });
      ref.update();
      expect(bar.hidden).toBe(false);
      expect(bar.classList).toContain('overlay-scrollbar-visible');
      vi.advanceTimersByTime(5000);
      expect(bar.classList).toContain('overlay-scrollbar-visible');

      // Not once the pointer has left
      pointer('pointerleave');
      vi.advanceTimersByTime(500);
      Object.defineProperty(host, 'scrollHeight', { configurable: true, value: 600 });
      ref.update();
      expect(bar.classList).not.toContain('overlay-scrollbar-visible');
    });

    it('ignores touch', () => {
      vi.useFakeTimers();
      ref = attachOverlayScrollbar(host, { force: true, autoHide: 'leave' });
      ref.update();
      pointer('pointerenter', { pointerType: 'touch' });
      expect(frameOf(host)?.querySelector('.overlay-scrollbar-bar-y')?.classList).not.toContain(
        'overlay-scrollbar-visible'
      );
    });
  });
});

describe('autoAttachOverlayScrollbars', () => {
  let stop: () => void;

  afterEach(() => {
    stop?.();
    document.querySelectorAll('.auto-scroll').forEach(element => element.remove());
  });

  it('attaches to matching elements as they are added and detaches as they are removed', async () => {
    const existing = createScroller();
    existing.classList.add('auto-scroll');
    stop = autoAttachOverlayScrollbars('.auto-scroll', document.body, { force: true });
    expect(frameOf(existing)).not.toBeNull();

    const added = createScroller();
    added.classList.add('auto-scroll');
    await Promise.resolve();
    await Promise.resolve();
    expect(frameOf(added)).not.toBeNull();

    added.classList.remove('auto-scroll');
    await Promise.resolve();
    await Promise.resolve();
    expect(frameOf(added)).toBeNull();
    added.remove();
  });
  it('detaches elements removed from the page', async () => {
    const element = createScroller();
    element.classList.add('auto-scroll');
    stop = autoAttachOverlayScrollbars('.auto-scroll', document.body, { force: true });
    expect(frameOf(element)).not.toBeNull();

    element.remove();
    await settle();
    expect(frameOf(element)).toBeNull();
  });

  it('only attaches under its root', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const outside = createScroller();
    outside.classList.add('auto-scroll');
    stop = autoAttachOverlayScrollbars('.auto-scroll', root, { force: true });
    const inside = createScroller();
    inside.classList.add('auto-scroll');
    root.appendChild(inside);
    await settle();
    expect(frameOf(inside)).not.toBeNull();
    expect(frameOf(outside)).toBeNull();
    root.remove();
  });

  it('detaches everything and stops watching once stopped', async () => {
    const element = createScroller();
    element.classList.add('auto-scroll');
    stop = autoAttachOverlayScrollbars('.auto-scroll', document.body, { force: true });
    stop();
    expect(frameOf(element)).toBeNull();

    const added = createScroller();
    added.classList.add('auto-scroll');
    await settle();
    expect(frameOf(added)).toBeNull();
  });

  it('stops for good, even with a look for matching elements already queued', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    stop = autoAttachOverlayScrollbars('.auto-scroll', root, { force: true });
    const added = document.createElement('div');
    added.className = 'auto-scroll';
    root.appendChild(added);
    // Its observer has seen the change and queued a look, which stopping now has to cancel
    await Promise.resolve();
    stop();
    await settle();
    expect(frameOf(added)).toBeNull();
    expect(added.classList).not.toContain('overlay-scrollbar-host');
    root.remove();
  });

  it('attaches as an attribute the selector looks for is added', async () => {
    const element = createScroller();
    element.classList.add('auto-scroll');
    stop = autoAttachOverlayScrollbars('.auto-scroll[data-scroll]', document.body, { force: true });
    expect(frameOf(element)).toBeNull();

    element.setAttribute('data-scroll', '');
    await settle();
    expect(frameOf(element)).not.toBeNull();
  });

  it('attaches again where other bars replaced its own and were then destroyed', async () => {
    const element = createScroller();
    element.classList.add('auto-scroll', 'other-scroll');
    stop = autoAttachOverlayScrollbars('.auto-scroll', document.body, { force: true });
    // Another selector matching the same element replaces the bars, and then stops
    const stopOther = autoAttachOverlayScrollbars('.other-scroll', document.body, { force: true });
    stopOther();
    await settle();
    expect(frameOf(element)).not.toBeNull();

    // So does attaching by hand, then destroying
    attachOverlayScrollbar(element, { force: true }).destroy();
    await settle();
    expect(frameOf(element)).not.toBeNull();
  });

  it('leaves alone bars something else attached to an element it matches', async () => {
    const element = createScroller();
    element.classList.add('auto-scroll');
    stop = autoAttachOverlayScrollbars('.auto-scroll', document.body, { force: true });
    const own = attachOverlayScrollbar(element, { force: true, autoHide: false });
    element.setAttribute('data-changed', '');
    element.classList.add('changed');
    await settle();
    expect(frameOf(element)?.classList).toContain('overlay-scrollbar-always');
    own.destroy();
  });

  it('notices an attribute the selector names in another case, as HTML attribute names have none', async () => {
    const element = createScroller();
    element.classList.add('auto-scroll');
    stop = autoAttachOverlayScrollbars('.auto-scroll[data-Scroll]', document.body, { force: true });
    element.setAttribute('data-scroll', '');
    await settle();
    expect(frameOf(element)).not.toBeNull();
  });

  it("doesn't look for matching elements again when an attribute the selector doesn't name changes", async () => {
    const element = createScroller();
    element.classList.add('auto-scroll');
    stop = autoAttachOverlayScrollbars('.auto-scroll[data-scroll]', document.body, { force: true });
    await settle();
    const search = vi.spyOn(document.body, 'querySelectorAll');
    element.setAttribute('aria-busy', 'true');
    element.setAttribute('data-other', '');
    await settle();
    const searches = search.mock.calls.length;
    search.mockRestore();
    expect(searches).toBe(0);
  });

  it("doesn't look for matching elements again when only the bars change, e.g. on every scroll", async () => {
    const element = createScroller();
    element.classList.add('auto-scroll');
    stop = autoAttachOverlayScrollbars('.auto-scroll', document.body, { force: true, autoHide: false });
    await settle();
    const search = vi.spyOn(document.body, 'querySelectorAll');
    for (const top of [10, 20, 30]) {
      scrollTo(element, top);
      await settle();
    }
    const searches = search.mock.calls.length;
    search.mockRestore();
    expect(searches).toBe(0);
  });
});

describe('the drawn frame', () => {
  let host: HTMLElement;
  let ref: OverlayScrollbarRef;
  const frameCustomProperty = (element: HTMLElement, name: string): string =>
    frameOf(element)?.style.getPropertyValue(name) ?? '';

  beforeEach(() => {
    host = createScroller();
  });

  afterEach(() => {
    ref?.destroy();
    host.remove();
    vi.restoreAllMocks();
  });

  it('stops listening when destroyed (the ResizeObserver is covered by the browser specs)', () => {
    const removeListener = vi.spyOn(host, 'removeEventListener');
    const disconnectMutations = vi.spyOn(MutationObserver.prototype, 'disconnect');
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();

    ref.destroy();
    expect(removeListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    // The host's children observer, and the shared direction observer it was the last user of
    expect(disconnectMutations).toHaveBeenCalledTimes(2);
  });

  it('re-measures content that changed size out of sight of the ResizeObserver when scrolled or pointed at', () => {
    ref = attachOverlayScrollbar(host, { force: true });
    // A 900px track, so the thumb is 900px × 100px visible / the content's height
    Object.defineProperty(frameOf(host)?.querySelector('.overlay-scrollbar-bar-y'), 'clientHeight', { value: 900 });
    ref.update();
    Object.defineProperty(host, 'scrollHeight', { configurable: true, value: 800 });
    scrollTo(host, 10);
    expect(frameCustomProperty(host, '--_overlay-scrollbar-thumb-y')).toBe('112.5px');

    Object.defineProperty(host, 'scrollHeight', { configurable: true, value: 900 });
    frameOf(host)?.dispatchEvent(new PointerEvent('pointerover'));
    expect(frameCustomProperty(host, '--_overlay-scrollbar-thumb-y')).toBe('100px');

    Object.defineProperty(host, 'scrollHeight', { configurable: true, value: 300 });
    scrollTo(host, 20);
    expect(frameCustomProperty(host, '--_overlay-scrollbar-thumb-y')).toBe('300px');
  });

  it('only starts watching the children added, so a long list growing a row at a time stays cheap', async () => {
    host.append(...Array.from({ length: 50 }, () => document.createElement('p')));
    ref = attachOverlayScrollbar(host, { force: true });
    const observer = sharedResizeObserver(host);
    observer.observe.mockClear();
    observer.unobserve.mockClear();

    const row = host.appendChild(document.createElement('p'));
    await settle();
    expect(observer.observe).toHaveBeenCalledTimes(1);
    expect(observer.observe).toHaveBeenCalledWith(row);
    expect(observer.unobserve).not.toHaveBeenCalled();

    row.remove();
    await settle();
    expect(observer.unobserve).toHaveBeenCalledTimes(1);
    expect(observer.unobserve).toHaveBeenCalledWith(row);
  });

  it('brings up the bars of elements measured together with one style recalculation, not one each', () => {
    const hosts = [host, createScroller(), createScroller()];
    const refs = hosts.map(element => attachOverlayScrollbar(element, { force: true, autoHide: false }));
    const recalculations = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get');
    // What the shared ResizeObserver does when they all resize in one frame (jsdom never sends one)
    sharedResizeObserver(host).resize(hosts.map(target => ({ target })));
    expect(recalculations).toHaveBeenCalledTimes(1);
    expect(hosts.every(element => frameOf(element)?.querySelector('.overlay-scrollbar-visible'))).toBe(true);
    refs.forEach(other => other.destroy());
    hosts.slice(1).forEach(element => element.remove());
  });

  it("hides the bar for an axis the element can't scroll, however much content overflows", () => {
    host.style.overflowY = 'hidden';
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    expect((frameOf(host)?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement).hidden).toBe(true);
  });

  it('counts how deeply an element is nested in others with bars, for their stacking order', () => {
    const inner = document.createElement('div');
    inner.style.overflowY = 'auto';
    host.appendChild(inner);
    ref = attachOverlayScrollbar(host, { force: true });
    ref.update();
    const innerRef = attachOverlayScrollbar(inner, { force: true });
    ref.update();
    innerRef.update();
    expect(frameCustomProperty(host, '--_overlay-scrollbar-depth')).toBe('0');
    expect(frameCustomProperty(inner, '--_overlay-scrollbar-depth')).toBe('1');
    innerRef.destroy();
  });
});

describe('on the server', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attaches nothing and returns refs that do nothing', () => {
    vi.stubGlobal('document', undefined);
    const ref = attachOverlayScrollbar({} as HTMLElement, { force: true });
    expect(() => {
      ref.update();
      ref.destroy();
    }).not.toThrow();
    const stop = autoAttachOverlayScrollbars('.scroll-y');
    expect(() => stop()).not.toThrow();
  });
});
