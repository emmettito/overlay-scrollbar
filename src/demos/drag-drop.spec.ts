import type { Mock } from 'vitest';
import { autoScrollSpeed, dropIndex, enableDragging } from './drag-drop';

describe('autoScrollSpeed', () => {
  // A list from 100px to 460px down the screen; it scrolls within 48px of either edge
  const speed = (y: number): number => autoScrollSpeed(y, 100, 460);

  it("doesn't scroll away from the edges", () => {
    expect(speed(148)).toBe(0);
    expect(speed(280)).toBe(0);
    expect(speed(412)).toBe(0);
  });

  it('scrolls up near the top and down near the bottom, faster nearer the edge', () => {
    expect(speed(140)).toBeLessThan(0);
    expect(speed(110)).toBeLessThan(speed(140));
    expect(speed(420)).toBeGreaterThan(0);
    expect(speed(450)).toBeGreaterThan(speed(420));
  });

  it('scrolls no faster than 16px a frame, even with the pointer past the edge', () => {
    expect(speed(100)).toBe(-16);
    expect(speed(0)).toBe(-16);
    expect(speed(460)).toBe(16);
    expect(speed(900)).toBe(16);
  });
});

describe('dropIndex', () => {
  const midpoints = [20, 60, 100];

  it('drops before the first item whose middle is below the pointer', () => {
    expect(dropIndex(midpoints, 0)).toBe(0);
    expect(dropIndex(midpoints, 59)).toBe(1);
    expect(dropIndex(midpoints, 60)).toBe(2);
  });

  it('drops at the end below the last middle, and in an empty list', () => {
    expect(dropIndex(midpoints, 500)).toBe(3);
    expect(dropIndex([], 10)).toBe(0);
  });
});

describe('enableDragging', () => {
  // jsdom has no layout: two 200 × 400px lists side by side, 300px apart, of 40px-tall items, scrolled by scrollTop
  const layout = (element: HTMLElement): DOMRect => {
    const box = (left: number, top: number, width: number, height: number): DOMRect =>
      ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top }) as DOMRect;
    const list = element.closest<HTMLElement>('.list');
    const left = list ? lists.indexOf(list) * 300 : 0;
    if (element.classList.contains('list')) {
      return box(left, 0, 200, 400);
    }
    if (element.classList.contains('item') && list) {
      return box(left, [...list.children].indexOf(element) * 40 - list.scrollTop, 200, 40);
    }
    return box(0, 0, 0, 0);
  };

  let board: HTMLElement;
  let lists: HTMLElement[];
  let onDrop: Mock;
  let stop: () => void;
  let frames: FrameRequestCallback[];

  const pointer = (type: string, x: number, y: number, init: PointerEventInit = {}): PointerEvent =>
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: x,
      clientY: y,
      ...init
    });
  const item = (name: string): HTMLElement => board.querySelector(`[data-name="${name}"]`) as HTMLElement;
  const names = (list: HTMLElement): string[] =>
    [...list.querySelectorAll<HTMLElement>('.item')].map(element => element.dataset['name'] ?? '');
  const ghost = (): Element | null => board.querySelector('.ghost');
  // Picks up A1 by its handle (at 10, 20) with the mouse, and moves it over the second list, between B1 and B2
  const dragA1ToB = (): void => {
    item('A1')
      .querySelector('.handle')
      ?.dispatchEvent(pointer('pointerdown', 10, 20));
    dispatchEvent(pointer('pointermove', 15, 25));
    dispatchEvent(pointer('pointermove', 350, 50));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal('cancelAnimationFrame', () => (frames = []));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return layout(this);
    });
    board = document.body.appendChild(document.createElement('div'));
    const list = (prefix: string, count: number): string =>
      `<div class="list">${Array.from(
        { length: count },
        (_, i) =>
          `<div class="item" data-name="${prefix}${i + 1}"><span class="handle"></span><span>${prefix}${i + 1}</span></div>`
      ).join('')}</div>`;
    board.innerHTML = list('A', 5) + list('B', 2);
    lists = [...board.querySelectorAll<HTMLElement>('.list')];
    onDrop = vi.fn();
    stop = enableDragging(board, onDrop);
  });

  afterEach(() => {
    stop();
    board.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('moves an item dragged by its handle to where it is dropped, in another list', () => {
    dragA1ToB();
    expect(ghost()).not.toBeNull();
    expect(item('A1').classList).toContain('placeholder');
    expect(names(lists[1])).toEqual(['B1', 'A1', 'B2']);

    dispatchEvent(pointer('pointerup', 350, 50));
    expect(ghost()).toBeNull();
    expect(item('A1').classList).not.toContain('placeholder');
    expect(names(lists[0])).toEqual(['A2', 'A3', 'A4', 'A5']);
    expect(names(lists[1])).toEqual(['B1', 'A1', 'B2']);
    expect(onDrop).toHaveBeenCalledOnce();
  });

  it('reorders within a list', () => {
    item('A1')
      .querySelector('.handle')
      ?.dispatchEvent(pointer('pointerdown', 10, 20));
    // Past A3's middle (100), so after it
    dispatchEvent(pointer('pointermove', 50, 105));
    dispatchEvent(pointer('pointerup', 50, 105));
    expect(names(lists[0])).toEqual(['A2', 'A3', 'A1', 'A4', 'A5']);
  });

  it("doesn't pick an item up until the pointer has moved a few pixels, so a click on the handle does nothing", () => {
    item('A1')
      .querySelector('.handle')
      ?.dispatchEvent(pointer('pointerdown', 10, 20));
    dispatchEvent(pointer('pointermove', 12, 21));
    expect(ghost()).toBeNull();
    dispatchEvent(pointer('pointerup', 12, 21));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("ignores a mouse press away from the handle, e.g. selecting the item's text", () => {
    item('A1').lastElementChild?.dispatchEvent(pointer('pointerdown', 100, 20));
    dispatchEvent(pointer('pointermove', 350, 50));
    expect(ghost()).toBeNull();
    expect(names(lists[1])).toEqual(['B1', 'B2']);
  });

  it.each([
    ['Escape', (): unknown => dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))],
    ['pointercancel', (): unknown => dispatchEvent(pointer('pointercancel', 350, 50))],
    ['the window losing focus, e.g. switching app mid-drag', (): unknown => dispatchEvent(new Event('blur'))]
  ])('puts the item back where it was on %s', (_, cancel) => {
    dragA1ToB();
    cancel();
    expect(ghost()).toBeNull();
    expect(names(lists[0])).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
    expect(names(lists[1])).toEqual(['B1', 'B2']);

    // And stops following the pointer
    dispatchEvent(pointer('pointermove', 350, 90));
    dispatchEvent(pointer('pointerup', 350, 90));
    expect(names(lists[0])).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
  });

  it('follows only the pointer that picked the item up', () => {
    dragA1ToB();
    dispatchEvent(pointer('pointermove', 50, 150, { pointerId: 2 }));
    dispatchEvent(pointer('pointerup', 50, 150, { pointerId: 2 }));
    expect(ghost()).not.toBeNull();
    expect(names(lists[1])).toEqual(['B1', 'A1', 'B2']);
    // Nor does a second press take the drag over: the second pointer moving does nothing, and the first still drops it
    item('A2')
      .querySelector('.handle')
      ?.dispatchEvent(pointer('pointerdown', 10, 20, { pointerId: 2 }));
    dispatchEvent(pointer('pointermove', 350, 10, { pointerId: 2 }));
    expect(names(lists[1])).toEqual(['B1', 'A1', 'B2']);
    // Past A4's middle (100, with A1 gone from the list), so before A5
    dispatchEvent(pointer('pointermove', 50, 105));
    dispatchEvent(pointer('pointerup', 50, 105));
    expect(board.querySelectorAll('.ghost')).toHaveLength(0);
    expect(names(lists[0])).toEqual(['A2', 'A3', 'A4', 'A1', 'A5']);
  });

  it('scrolls the list under the pointer each frame while it is near the bottom edge', () => {
    lists[0].scrollBy = vi.fn() as Element['scrollBy'];
    item('A1')
      .querySelector('.handle')
      ?.dispatchEvent(pointer('pointerdown', 10, 20));
    dispatchEvent(pointer('pointermove', 100, 390));
    frames.shift()?.(0);
    expect(lists[0].scrollBy).toHaveBeenCalledWith({ top: expect.any(Number) as number, behavior: 'instant' });
    expect((vi.mocked(lists[0].scrollBy).mock.calls[0][0] as ScrollToOptions).top).toBeGreaterThan(0);
    // And keeps going, frame after frame
    expect(frames).toHaveLength(1);
  });

  describe('on touch', () => {
    const touch = (type: string, x: number, y: number): PointerEvent => pointer(type, x, y, { pointerType: 'touch' });

    it('picks an item up with a long press anywhere on it', () => {
      item('A2').lastElementChild?.dispatchEvent(touch('pointerdown', 100, 60));
      vi.advanceTimersByTime(349);
      expect(ghost()).toBeNull();
      vi.advanceTimersByTime(1);
      expect(ghost()).not.toBeNull();
      expect(item('A2').classList).toContain('placeholder');
    });

    it("lets a touch that moves before the long press is up scroll the list, and doesn't pick anything up", () => {
      item('A2').lastElementChild?.dispatchEvent(touch('pointerdown', 100, 60));
      vi.advanceTimersByTime(100);
      dispatchEvent(touch('pointermove', 100, 40));
      vi.advanceTimersByTime(1000);
      expect(ghost()).toBeNull();
      dispatchEvent(touch('pointermove', 350, 50));
      expect(names(lists[1])).toEqual(['B1', 'B2']);
    });

    it('stops the touch scrolling the list only once an item is picked up', () => {
      const touchmove = (): boolean =>
        item('A2').dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true }));
      item('A2').lastElementChild?.dispatchEvent(touch('pointerdown', 100, 60));
      // dispatchEvent is false when the default was prevented
      expect(touchmove()).toBe(true);
      vi.advanceTimersByTime(350);
      expect(touchmove()).toBe(false);
    });

    it('opens no context menu or callout on a long press', () => {
      item('A2').lastElementChild?.dispatchEvent(touch('pointerdown', 100, 60));
      expect(item('A2').dispatchEvent(new Event('contextmenu', { bubbles: true, cancelable: true }))).toBe(false);
    });
  });

  it('stops listening on the window once a drag ends', () => {
    const added = vi.spyOn(window, 'addEventListener');
    const removed = vi.spyOn(window, 'removeEventListener');
    dragA1ToB();
    dispatchEvent(pointer('pointerup', 350, 50));
    const listeners = (spy: typeof added): unknown[][] => spy.mock.calls.map(([type, listener]) => [type, listener]);
    expect(listeners(added).map(([type]) => type)).toEqual([
      'pointermove',
      'pointerup',
      'pointercancel',
      'keydown',
      'blur'
    ]);
    expect(listeners(removed)).toEqual(expect.arrayContaining(listeners(added)));
  });

  it('puts a dragged item back and stops listening when stopped, e.g. leaving the page mid-drag', () => {
    dragA1ToB();
    stop();
    expect(ghost()).toBeNull();
    expect(names(lists[0])).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);

    item('A1')
      .querySelector('.handle')
      ?.dispatchEvent(pointer('pointerdown', 10, 20, { pointerId: 3 }));
    dispatchEvent(pointer('pointermove', 350, 50, { pointerId: 3 }));
    expect(ghost()).toBeNull();
  });
});
