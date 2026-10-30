import { attachOverlayScrollbar } from '../overlay-scrollbar.js';
import { drawsOverlayScrollbars, hasClassicScrollbars, watchScrollbarStyle } from './scrollbar-style.js';

// In a browser spec file, so the module's media query and probe are created here, from the fake below: each file gets a
// fresh page, unlike jsdom's shared workers.

// Stands in for (any-pointer: fine), so a mouse can be plugged in and out
const finePointer = {
  matches: false,
  listeners: new Set<() => void>(),
  set(matches: boolean): void {
    this.matches = matches;
    this.listeners.forEach(listener => listener());
  }
};

describe('scrollbar style detection', () => {
  const realMatchMedia = window.matchMedia;

  beforeAll(() => {
    window.matchMedia = (query: string): MediaQueryList =>
      query === '(any-pointer: fine)'
        ? ({
            get matches() {
              return finePointer.matches;
            },
            media: query,
            addEventListener: (_type: string, listener: () => void) => finePointer.listeners.add(listener),
            removeEventListener: (_type: string, listener: () => void) => finePointer.listeners.delete(listener)
          } as unknown as MediaQueryList)
        : realMatchMedia.call(window, query);
  });

  afterAll(() => {
    window.matchMedia = realMatchMedia;
  });

  it('detects scrollbars that take up space', () => {
    const box = document.createElement('div');
    box.style.cssText = 'width: 100px; height: 100px; overflow: scroll';
    document.body.appendChild(box);
    expect(hasClassicScrollbars()).toBe(box.offsetWidth > box.clientWidth);
    box.remove();
  });

  it('draws the bars with a fine pointer, or with scrollbars that take up space', () => {
    finePointer.set(true);
    expect(drawsOverlayScrollbars()).toBe(true);
    finePointer.set(false);
    expect(drawsOverlayScrollbars()).toBe(hasClassicScrollbars());
  });

  it('tells its watchers when a mouse is plugged in or out, until they stop watching', () => {
    const listener = vi.fn();
    const unwatch = watchScrollbarStyle(listener);
    finePointer.set(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unwatch();
    finePointer.set(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('adds and removes the bars on an attached element as that changes', context => {
    if (hasClassicScrollbars()) {
      // The bars are always drawn here, whatever the pointer
      context.skip();
    }
    finePointer.set(false);
    // In a wrapper, so the frame would be its next sibling: the probe that watches the scrollbar style goes in the body
    const wrapper = document.createElement('div');
    const host = document.createElement('div');
    host.style.cssText = 'width: 100px; height: 100px; overflow: auto';
    wrapper.appendChild(host);
    document.body.appendChild(wrapper);
    const ref = attachOverlayScrollbar(host);
    expect(host.nextElementSibling).toBeNull();

    finePointer.set(true);
    expect(host.nextElementSibling?.classList).toContain('overlay-scrollbar-frame');
    finePointer.set(false);
    expect(host.nextElementSibling).toBeNull();

    ref.destroy();
    wrapper.remove();
  });
});
