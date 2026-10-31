import { PAGE_OVERLAP } from '../models/constants.js';

/**
 * Click on the track: scrolls a page towards the click. `pointerPosition` is the click's clientY (or clientX). Smooth,
 * as browsers animate a user's own scrolling whatever the element's scroll-behavior (which is for scripts' scrolling),
 * and instant for users who prefer reduced motion.
 */
export function pageTowards(host: HTMLElement, vertical: boolean, pointerPosition: number, thumbRect: DOMRect): void {
  const page = Math.max((vertical ? host.clientHeight : host.clientWidth) - PAGE_OVERLAP, 1);
  const thumbStart = vertical ? thumbRect.top : thumbRect.left;
  const thumbEnd = vertical ? thumbRect.bottom : thumbRect.right;
  const forward = pointerPosition > thumbEnd ? 1 : pointerPosition < thumbStart ? -1 : 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  host.scrollBy({ [vertical ? 'top' : 'left']: forward * page, behavior: reducedMotion ? 'instant' : 'smooth' });
}

/** Option-click on the track: jumps so the thumb is centred on the spot clicked. */
export function jumpToSpot(
  host: HTMLElement,
  vertical: boolean,
  reversed: boolean,
  pointerPosition: number,
  trackRect: DOMRect,
  thumbRect: DOMRect,
  travel: number
): void {
  const thumbLength = vertical ? thumbRect.height : thumbRect.width;
  // Where the thumb's start goes, from the track's start: its right or bottom end where the axis is reversed, scrolling
  // from 0 down to minus the range (e.g. scrollLeft in RTL)
  const thumbStart = reversed
    ? (vertical ? trackRect.bottom : trackRect.right) - pointerPosition - thumbLength / 2
    : pointerPosition - (vertical ? trackRect.top : trackRect.left) - thumbLength / 2;
  const maxScroll = vertical ? host.scrollHeight - host.clientHeight : host.scrollWidth - host.clientWidth;
  const progress = travel > 0 ? Math.max(0, Math.min(1, thumbStart / travel)) : 0;
  // Instant, whatever scroll-behavior the element has
  host.scrollTo({
    [vertical ? 'top' : 'left']: progress * maxScroll * (reversed ? -1 : 1),
    behavior: 'instant'
  });
}
