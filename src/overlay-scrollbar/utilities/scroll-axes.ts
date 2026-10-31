/** Which way an element scrolls on each axis, and which side its vertical bar goes, from its writing mode and direction. */
export interface ScrollAxes {
  /** scrollLeft runs from 0 down to minus the range: the content starts on the right */
  reverseX: boolean;
  /** scrollTop runs from 0 down to minus the range: the content starts at the bottom */
  reverseY: boolean;
  /** The vertical bar goes on the left rather than the right */
  barYLeft: boolean;
}

/**
 * The scroll axes for a computed writing-mode and direction, as Chromium, WebKit and Firefox all scroll:
 * - horizontal text: scrollLeft runs negative right to left (rtl), and the vertical bar goes on the left there
 * - vertical text: lines run right to left in vertical-rl and sideways-rl, so scrollLeft runs negative; each line runs
 *   bottom to top in rtl, and in sideways-lr unless rtl, so scrollTop runs negative
 * The vertical bar stays on the right in vertical text, as Chromium puts its own scrollbar there.
 */
export function scrollAxes(writingMode: string, direction: string): ScrollAxes {
  const rtl = direction === 'rtl';
  if (!writingMode.startsWith('vertical') && !writingMode.startsWith('sideways')) {
    return { reverseX: rtl, reverseY: false, barYLeft: rtl };
  }
  return { reverseX: writingMode.endsWith('-rl'), reverseY: rtl !== (writingMode === 'sideways-lr'), barYLeft: false };
}

/** Whether two ScrollAxes are the same, field by field, whatever fields ScrollAxes has */
export function sameAxes(a: ScrollAxes, b: ScrollAxes): boolean {
  return (Object.keys(a) as (keyof ScrollAxes)[]).every(key => a[key] === b[key]);
}
