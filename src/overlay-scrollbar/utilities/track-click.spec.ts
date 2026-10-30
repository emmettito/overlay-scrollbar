import { jumpToSpot, pageTowards } from './track-click.js';

// jsdom has no layout, so sizes and rects are given by hand: a 200×100 box with 600×500 of content
function createHost(): HTMLElement {
  const host = document.createElement('div');
  Object.defineProperties(host, {
    clientWidth: { configurable: true, value: 200 },
    clientHeight: { configurable: true, value: 100 },
    scrollWidth: { configurable: true, value: 600 },
    scrollHeight: { configurable: true, value: 500 },
    scrollTop: { configurable: true, writable: true, value: 0 },
    scrollLeft: { configurable: true, writable: true, value: 0 },
    scrollBy: { configurable: true, value: vi.fn() }
  });
  return host;
}

function rect(start: number, length: number, vertical: boolean): DOMRect {
  return (
    vertical
      ? { top: start, bottom: start + length, height: length, left: 0, right: 10, width: 10 }
      : { left: start, right: start + length, width: length, top: 0, bottom: 10, height: 10 }
  ) as DOMRect;
}

describe('pageTowards', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = createHost();
  });

  it('pages down or up towards the click, keeping 10px of the last page in view', () => {
    const thumb = rect(40, 20, true);
    pageTowards(host, true, 80, thumb);
    expect(host.scrollBy).toHaveBeenLastCalledWith({ top: 90, behavior: 'smooth' });
    pageTowards(host, true, 10, thumb);
    expect(host.scrollBy).toHaveBeenLastCalledWith({ top: -90, behavior: 'smooth' });
  });

  it("doesn't move for a click on the thumb's own span", () => {
    pageTowards(host, true, 50, rect(40, 20, true));
    expect(host.scrollBy).toHaveBeenLastCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('pages sideways on the horizontal bar', () => {
    pageTowards(host, false, 150, rect(20, 40, false));
    expect(host.scrollBy).toHaveBeenLastCalledWith({ left: 190, behavior: 'smooth' });
  });

  it('pages at least 1px in a box smaller than the overlap', () => {
    Object.defineProperty(host, 'clientHeight', { configurable: true, value: 5 });
    pageTowards(host, true, 80, rect(0, 20, true));
    expect(host.scrollBy).toHaveBeenLastCalledWith({ top: 1, behavior: 'smooth' });
  });
});

describe('jumpToSpot', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = createHost();
  });

  it('centres the thumb on the spot clicked', () => {
    // A 100px track with a 20px thumb: 80px of travel for 400px of scrolling. The thumb's centre at 50 puts its start
    // at 40, halfway along.
    jumpToSpot(host, true, false, 50, rect(0, 100, true), rect(0, 20, true), 80);
    expect(host.scrollTop).toBe(200);
  });

  it('jumps instantly, even on an element with scroll-behavior: smooth', () => {
    const scrollTo = vi.spyOn(host, 'scrollTo');
    jumpToSpot(host, true, false, 50, rect(0, 100, true), rect(0, 20, true), 80);
    expect(scrollTo).toHaveBeenCalledWith({ top: 200, behavior: 'instant' });
  });

  it('measures from where the track starts', () => {
    jumpToSpot(host, true, false, 150, rect(100, 100, true), rect(100, 20, true), 80);
    expect(host.scrollTop).toBe(200);
  });

  it('clamps to the ends of the scroll range', () => {
    jumpToSpot(host, true, false, 2, rect(0, 100, true), rect(0, 20, true), 80);
    expect(host.scrollTop).toBe(0);
    jumpToSpot(host, true, false, 99, rect(0, 100, true), rect(0, 20, true), 80);
    expect(host.scrollTop).toBe(400);
  });

  it('jumps sideways on the horizontal bar', () => {
    // A 200px track with a 40px thumb: 160px of travel for 400px of scrolling
    jumpToSpot(host, false, false, 100, rect(0, 200, false), rect(0, 40, false), 160);
    expect(host.scrollLeft).toBe(200);
  });

  it('measures from the right in RTL, where scrollLeft runs negative', () => {
    // The thumb's centre 50px from the right puts its start 30px in: 30/160 of the way
    jumpToSpot(host, false, true, 150, rect(0, 200, false), rect(160, 40, false), 160);
    expect(host.scrollLeft).toBe(-75);
  });

  it('goes to the start rather than dividing by zero when the thumb has no travel', () => {
    host.scrollTop = 30;
    jumpToSpot(host, true, false, 50, rect(0, 100, true), rect(0, 100, true), 0);
    expect(host.scrollTop).toBe(0);
  });
});
