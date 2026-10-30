// Defaults for OverlayScrollbarOptions. Timings in ms.

// The pointer has to stay on the bar this long before it shows and expands, so passing over it does nothing:
// 50-100ms after the pointer reaches the bar, never while it's swept across.
export const HOVER_DELAY = 80;
// How long a bar stays after scrolling stops, and after the pointer leaves it, before it fades
export const HIDE_AFTER_SCROLL = 700;
export const HIDE_AFTER_LEAVE = 500;

// Shortest thumb, in px
export const MIN_THUMB_LENGTH = 20;
// A page scroll keeps this much of the previous page in view, in px
export const PAGE_OVERLAP = 10;
