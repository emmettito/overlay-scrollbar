import { attachOverlayScrollbar, type OverlayScrollbarOptions } from '@emmettito/overlay-scrollbar';
import type { Action } from 'svelte/action';

/** Draws overlay scrollbars on the element: `use:overlayScrollbar={options}`. */
export const overlayScrollbar: Action<HTMLElement, OverlayScrollbarOptions | undefined> = (element, options) => {
  let scrollbar = attachOverlayScrollbar(element, options);
  let key = JSON.stringify(options);
  return {
    update(next) {
      // Compared by value, so options rebuilt with the same values don't re-attach the bars
      if (JSON.stringify(next) !== key) {
        key = JSON.stringify(next);
        scrollbar.destroy();
        scrollbar = attachOverlayScrollbar(element, next);
      }
    },
    destroy() {
      scrollbar.destroy();
    }
  };
};
