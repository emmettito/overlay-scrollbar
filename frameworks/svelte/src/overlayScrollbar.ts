import { attachOverlayScrollbar, type OverlayScrollbarOptions } from '@emmettito/overlay-scrollbar';
import type { Action } from 'svelte/action';

// The options by value, in any key order, with none the same as {}
const keyOf = (options: OverlayScrollbarOptions = {}): string => JSON.stringify(options, Object.keys(options).sort());

/** Draws overlay scrollbars on the element: `use:overlayScrollbar={options}`. */
export const overlayScrollbar: Action<HTMLElement, OverlayScrollbarOptions | undefined> = (element, options) => {
  let scrollbar = attachOverlayScrollbar(element, options);
  let key = keyOf(options);
  return {
    update(next) {
      // Compared by value, so options rebuilt with the same values don't re-attach the bars
      if (keyOf(next) !== key) {
        key = keyOf(next);
        scrollbar.destroy();
        scrollbar = attachOverlayScrollbar(element, next);
      }
    },
    destroy() {
      scrollbar.destroy();
    }
  };
};
