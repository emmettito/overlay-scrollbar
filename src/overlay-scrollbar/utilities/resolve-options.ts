import { HIDE_AFTER_LEAVE, HIDE_AFTER_SCROLL, HOVER_DELAY, MIN_THUMB_LENGTH } from '../models/constants.js';
import { OverlayScrollbarOptions, ResolvedOverlayScrollbarOptions } from '../models/overlay-scrollbar-options.js';

/** Fills in the defaults. `??` rather than a spread, so an option passed as undefined still gets its default. */
export function resolveOptions(options: OverlayScrollbarOptions): ResolvedOverlayScrollbarOptions {
  return {
    force: options.force ?? false,
    autoHide: options.autoHide ?? true,
    hoverDelay: options.hoverDelay ?? HOVER_DELAY,
    hideAfterScroll: options.hideAfterScroll ?? HIDE_AFTER_SCROLL,
    hideAfterLeave: options.hideAfterLeave ?? HIDE_AFTER_LEAVE,
    minThumbLength: options.minThumbLength ?? MIN_THUMB_LENGTH
  };
}
