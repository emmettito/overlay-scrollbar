import { PAGE_OVERLAP } from '../models/constants.js';

/**
 * Click on the track: scrolls a page towards the click, like AppKit. `pointerPosition` is the click's clientY (or
 * clientX).
 */
export function pageTowards(host: HTMLElement, vertical: boolean, pointerPosition: number, thumbRect: DOMRect): void {
  const page = Math.max((vertical ? host.clientHeight : host.clientWidth) - PAGE_OVERLAP, 1);
  const thumbStart = vertical ? thumbRect.top : thumbRect.left;
  const thumbEnd = vertical ? thumbRect.bottom : thumbRect.right;
  const forward = pointerPosition > thumbEnd ? 1 : pointerPosition < thumbStart ? -1 : 0;
  host.scrollBy({ [vertical ? 'top' : 'left']: forward * page, behavior: 'smooth' });
}

/** Option-click on the track: jumps so the thumb is centred on the spot clicked, like AppKit. */
export function jumpToSpot(
  host: HTMLElement,
  vertical: boolean,
  rtl: boolean,
  pointerPosition: number,
  trackRect: DOMRect,
  thumbRect: DOMRect,
  travel: number
): void {
  const thumbLength = vertical ? thumbRect.height : thumbRect.width;
  // Where the thumb's start goes, from the track's start (its right edge in RTL, where scrollLeft is negative)
  const thumbStart =
    !vertical && rtl
      ? trackRect.right - pointerPosition - thumbLength / 2
      : pointerPosition - (vertical ? trackRect.top : trackRect.left) - thumbLength / 2;
  const maxScroll = vertical ? host.scrollHeight - host.clientHeight : host.scrollWidth - host.clientWidth;
  const progress = travel > 0 ? Math.max(0, Math.min(1, thumbStart / travel)) : 0;
  // Instant, as AppKit jumps, whatever scroll-behavior the element has
  host.scrollTo({
    [vertical ? 'top' : 'left']: progress * maxScroll * (rtl && !vertical ? -1 : 1),
    behavior: 'instant'
  });
}
