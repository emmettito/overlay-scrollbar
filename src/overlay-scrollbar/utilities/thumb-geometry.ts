import { MIN_THUMB_LENGTH } from '../models/constants.js';

export interface ThumbSize {
  /** The thumb's length along the track */
  length: number;
  /** How far the thumb moves along the track from one end of the scroll range to the other */
  travel: number;
}

/**
 * Sizes a thumb: the track times the visible part of the content, at least `minLength`, but never longer than the
 * track (a track shorter than `minLength` is filled by the thumb).
 */
export function measureThumb(track: number, visible: number, total: number, minLength = MIN_THUMB_LENGTH): ThumbSize {
  const length = Math.min(track, Math.max(minLength, (track * visible) / total));
  return { length, travel: Math.max(0, track - length) };
}

/**
 * How far `position` is past either end of 0..maxScroll: negative before the start, positive past the end. Safari
 * reports the scroll position past the ends while rubber-banding.
 */
export function overscroll(position: number, maxScroll: number): number {
  return position < 0 ? position : position > maxScroll ? position - maxScroll : 0;
}

/**
 * Places a thumb for the scroll position `position` (0..maxScroll), `overscrollDistance` past an end (see
 * overscroll()). While rubber-banding, the thumb gets shorter against the end it's bouncing at: WebKit gives AppKit a
 * knob proportion of (visible size - overscroll) / total size. Past the end, the offset grows by what the thumb lost,
 * so its far end stays at the end of the track. `offset` is from the start of the track.
 */
export function placeThumbOnTrack(
  position: number,
  maxScroll: number,
  overscrollDistance: number,
  visible: number,
  track: number,
  size: ThumbSize,
  minLength = MIN_THUMB_LENGTH
): { length: number; offset: number } {
  const total = maxScroll + visible;
  const length = overscrollDistance
    ? Math.min(size.length, Math.max(minLength, (track * (visible - Math.abs(overscrollDistance))) / total))
    : size.length;
  const offset =
    (maxScroll > 0 ? Math.min(Math.max(position, 0), maxScroll) / maxScroll : 0) * size.travel +
    (overscrollDistance > 0 ? size.length - length : 0);
  return { length, offset };
}
