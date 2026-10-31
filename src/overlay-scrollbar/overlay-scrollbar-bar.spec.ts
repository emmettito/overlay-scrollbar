import { OverlayScrollbarBar } from './overlay-scrollbar-bar.js';
import { resolveOptions } from './utilities/resolve-options.js';

// jsdom has no layout: a 100px-tall box with 500px of content, and a thumb with 80px of travel
const travel = 80;

function pointer(type: string, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse', ...init });
}

describe('OverlayScrollbarBar', () => {
  let host: HTMLElement;
  let bar: OverlayScrollbarBar;

  beforeEach(() => {
    vi.useFakeTimers();
    host = document.createElement('div');
    Object.defineProperties(host, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 500 },
      scrollTop: { configurable: true, writable: true, value: 0 },
      scrollBy: { configurable: true, value: vi.fn() }
    });
    bar = new OverlayScrollbarBar(
      host,
      true,
      resolveOptions({}),
      () => travel,
      () => false
    );
    // jsdom has no pointer capture
    Object.defineProperty(bar.thumb, 'setPointerCapture', { configurable: true, value: () => undefined });
    host.appendChild(bar.element);
    document.body.appendChild(host);
  });

  afterEach(() => {
    bar.destroy();
    host.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('dragging the thumb', () => {
    it('scrolls by the pointer movement scaled from the travel to the scroll range', () => {
      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
      expect(bar.element.classList).toContain('overlay-scrollbar-dragging');
      expect(bar.element.classList).toContain('overlay-scrollbar-expanded');

      // 20px along 80px of travel is a quarter of the 400px range
      bar.thumb.dispatchEvent(pointer('pointermove', { clientY: 30 }));
      expect(host.scrollTop).toBe(100);
      bar.thumb.dispatchEvent(pointer('pointermove', { clientY: 0 }));
      expect(host.scrollTop).toBe(-50);
    });

    it('scrolls instantly, so the thumb keeps up even on an element with scroll-behavior: smooth', () => {
      const scrollTo = vi.spyOn(host, 'scrollTo');
      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
      bar.thumb.dispatchEvent(pointer('pointermove', { clientY: 30 }));
      expect(scrollTo).toHaveBeenCalledWith({ top: 100, behavior: 'instant' });
    });

    it('follows only the pointer that started the drag', () => {
      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
      // A second finger: neither its press, its moves nor its release take over the drag
      bar.element.dispatchEvent(pointer('pointerdown', { clientY: 60, pointerId: 2 }));
      bar.thumb.dispatchEvent(pointer('pointermove', { clientY: 90, pointerId: 2 }));
      bar.thumb.dispatchEvent(pointer('pointerup', { clientY: 90, pointerId: 2 }));
      expect(host.scrollBy).not.toHaveBeenCalled();
      expect(host.scrollTop).toBe(0);
      expect(bar.element.classList).toContain('overlay-scrollbar-dragging');

      bar.thumb.dispatchEvent(pointer('pointermove', { clientY: 30 }));
      expect(host.scrollTop).toBe(100);
    });

    it('stops following the pointer once released', () => {
      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
      bar.thumb.dispatchEvent(pointer('pointerup', { clientY: 10 }));
      expect(bar.element.classList).not.toContain('overlay-scrollbar-dragging');

      bar.thumb.dispatchEvent(pointer('pointermove', { clientY: 50 }));
      expect(host.scrollTop).toBe(0);
    });

    it('stops on pointercancel too', () => {
      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
      bar.thumb.dispatchEvent(pointer('pointercancel'));
      bar.thumb.dispatchEvent(pointer('pointermove', { clientY: 50 }));
      expect(host.scrollTop).toBe(0);
    });

    it('stops when it loses pointer capture without a pointerup, and can be dragged again', () => {
      // e.g. the bar hidden mid-drag, as the content stopped overflowing: the pointerup then goes elsewhere
      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
      bar.thumb.dispatchEvent(pointer('lostpointercapture'));
      expect(bar.element.classList).not.toContain('overlay-scrollbar-dragging');
      bar.thumb.dispatchEvent(pointer('pointermove', { clientY: 50 }));
      expect(host.scrollTop).toBe(0);

      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
      bar.thumb.dispatchEvent(pointer('pointermove', { clientY: 30 }));
      expect(host.scrollTop).toBe(100);
    });

    it("doesn't scroll when the thumb has no travel", () => {
      bar.destroy();
      bar.element.remove();
      bar = new OverlayScrollbarBar(
        host,
        true,
        resolveOptions({}),
        () => 0,
        () => false
      );
      Object.defineProperty(bar.thumb, 'setPointerCapture', { configurable: true, value: () => undefined });
      host.appendChild(bar.element);

      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
      bar.thumb.dispatchEvent(pointer('pointermove', { clientY: 50 }));
      expect(host.scrollTop).toBe(0);
    });

    it('stays expanded after a mouse drag that ends on the bar', () => {
      vi.spyOn(bar.element, 'matches').mockImplementation(selector => selector === ':hover');
      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10 }));
      bar.thumb.dispatchEvent(pointer('pointerup', { clientY: 10 }));
      vi.advanceTimersByTime(5000);
      expect(bar.element.classList).toContain('overlay-scrollbar-visible');
      expect(bar.element.classList).toContain('overlay-scrollbar-expanded');
    });

    it('fades out after a touch drag, although it leaves :hover stuck on the bar', () => {
      vi.spyOn(bar.element, 'matches').mockImplementation(selector => selector === ':hover');
      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10, pointerType: 'touch' }));
      bar.thumb.dispatchEvent(pointer('pointerup', { clientY: 10, pointerType: 'touch' }));
      expect(bar.element.classList).toContain('overlay-scrollbar-visible');
      vi.advanceTimersByTime(500);
      expect(bar.element.classList).not.toContain('overlay-scrollbar-visible');
    });
  });

  describe('dragging the horizontal thumb', () => {
    let horizontal: OverlayScrollbarBar;
    let rtl = false;

    beforeEach(() => {
      // A 100px-wide box with 500px of content, like the vertical one
      Object.defineProperties(host, {
        clientWidth: { configurable: true, value: 100 },
        scrollWidth: { configurable: true, value: 500 },
        scrollLeft: { configurable: true, writable: true, value: 0 }
      });
      horizontal = new OverlayScrollbarBar(
        host,
        false,
        resolveOptions({}),
        () => travel,
        () => rtl
      );
      Object.defineProperty(horizontal.thumb, 'setPointerCapture', { configurable: true, value: () => undefined });
      host.appendChild(horizontal.element);
    });

    afterEach(() => {
      horizontal.destroy();
      rtl = false;
    });

    it('scrolls sideways by the pointer movement', () => {
      horizontal.thumb.dispatchEvent(pointer('pointerdown', { clientX: 10 }));
      horizontal.thumb.dispatchEvent(pointer('pointermove', { clientX: 30 }));
      expect(host.scrollLeft).toBe(100);
    });

    it('scrolls from where the drag started in RTL, where scrollLeft runs negative', () => {
      rtl = true;
      host.scrollLeft = -200;
      // Dragging left, towards the end in RTL: scrollLeft goes further below 0
      horizontal.thumb.dispatchEvent(pointer('pointerdown', { clientX: 50 }));
      horizontal.thumb.dispatchEvent(pointer('pointermove', { clientX: 30 }));
      expect(host.scrollLeft).toBe(-300);
    });
  });

  describe('pressing the track', () => {
    it('pages towards the press', () => {
      // jsdom's rects are all zero, so the thumb sits at 0 and a press below it pages down
      bar.element.dispatchEvent(pointer('pointerdown', { clientY: 60 }));
      expect(host.scrollBy).toHaveBeenCalledWith({ top: 90, behavior: 'smooth' });
    });

    it('jumps to the spot with Option (Alt) held', () => {
      bar.element.dispatchEvent(pointer('pointerdown', { clientY: 40, altKey: true }));
      // Halfway along the 80px travel: halfway down the 400px range
      expect(host.scrollTop).toBe(200);
      expect(host.scrollBy).not.toHaveBeenCalled();
    });

    it('expands the bar at once, without waiting for the hover delay', () => {
      bar.element.dispatchEvent(pointer('pointerenter'));
      bar.element.dispatchEvent(pointer('pointerdown', { clientY: 60 }));
      expect(bar.element.classList).toContain('overlay-scrollbar-visible');
      expect(bar.element.classList).toContain('overlay-scrollbar-expanded');
    });

    it('fades out after a touch tap, which no pointerleave ends', () => {
      bar.element.dispatchEvent(pointer('pointerdown', { clientY: 60, pointerType: 'touch' }));
      bar.element.dispatchEvent(pointer('pointerup', { clientY: 60, pointerType: 'touch' }));
      bar.element.dispatchEvent(pointer('pointerleave', { pointerType: 'touch' }));
      expect(bar.element.classList).toContain('overlay-scrollbar-visible');
      vi.advanceTimersByTime(500);
      expect(bar.element.classList).not.toContain('overlay-scrollbar-visible');
    });

    it('ignores buttons other than the main one', () => {
      bar.element.dispatchEvent(pointer('pointerdown', { clientY: 60, button: 2 }));
      expect(host.scrollBy).not.toHaveBeenCalled();
      expect(bar.element.classList).not.toContain('overlay-scrollbar-visible');
    });
  });

  describe('right-clicking', () => {
    const onMac = (platform: string): void => {
      Object.defineProperty(navigator, 'platform', { configurable: true, get: () => platform });
    };

    afterEach(() => {
      // Back to jsdom's own, on Navigator.prototype
      Reflect.deleteProperty(navigator, 'platform');
    });

    it('opens no context menu on the bar or the thumb', () => {
      for (const target of [bar.element, bar.thumb]) {
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
        target.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
      }
    });

    it("treats a Mac's Control-click as a right-click, neither paging nor dragging", () => {
      onMac('MacIntel');
      bar.element.dispatchEvent(pointer('pointerdown', { clientY: 60, ctrlKey: true }));
      bar.thumb.dispatchEvent(pointer('pointerdown', { clientY: 10, ctrlKey: true }));
      expect(host.scrollBy).not.toHaveBeenCalled();
      expect(bar.element.classList).not.toContain('overlay-scrollbar-dragging');
    });

    it('pages on a Control-click elsewhere, where it is a plain click', () => {
      onMac('Win32');
      bar.element.dispatchEvent(pointer('pointerdown', { clientY: 60, ctrlKey: true }));
      expect(host.scrollBy).toHaveBeenCalledWith({ top: 90, behavior: 'smooth' });
    });
  });

  it('starts one hover delay however many pointers come onto it, and none once they have all left', () => {
    // A mouse and a pen, both passing over within the delay
    bar.element.dispatchEvent(pointer('pointerenter'));
    bar.element.dispatchEvent(pointer('pointerenter', { pointerId: 2, pointerType: 'pen' }));
    bar.element.dispatchEvent(pointer('pointerleave'));
    bar.element.dispatchEvent(pointer('pointerleave', { pointerId: 2, pointerType: 'pen' }));
    vi.advanceTimersByTime(5000);
    expect(bar.element.classList).not.toContain('overlay-scrollbar-visible');
  });

  it('keeps hovering while another pointer is still on the bar', () => {
    bar.element.dispatchEvent(pointer('pointerenter'));
    bar.element.dispatchEvent(pointer('pointerenter', { pointerId: 2, pointerType: 'pen' }));
    // The mouse leaves; the pen stays past the hover delay
    bar.element.dispatchEvent(pointer('pointerleave'));
    vi.advanceTimersByTime(100);
    expect(bar.element.classList).toContain('overlay-scrollbar-expanded');

    // The last one leaving: the bar fades out after hideAfterLeave, as it does for one pointer
    bar.element.dispatchEvent(pointer('pointerleave', { pointerId: 2, pointerType: 'pen' }));
    vi.advanceTimersByTime(500);
    expect(bar.element.classList).not.toContain('overlay-scrollbar-visible');
  });

  it('stops its timers when destroyed', () => {
    bar.show(700);
    bar.element.dispatchEvent(pointer('pointerenter'));
    bar.destroy();
    vi.advanceTimersByTime(1000);
    // Neither the hover nor the hide went off
    expect(bar.element.classList).toContain('overlay-scrollbar-visible');
    expect(bar.element.classList).not.toContain('overlay-scrollbar-expanded');
  });
});
