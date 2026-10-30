import {
  attachOverlayScrollbar,
  type OverlayScrollbarOptions,
  type OverlayScrollbarRef
} from '@emmettito/overlay-scrollbar';
import type { Directive } from 'vue';

const scrollbars = new WeakMap<HTMLElement, OverlayScrollbarRef>();

/** Draws overlay scrollbars on the element: `v-overlay-scrollbar="options"`. */
export const vOverlayScrollbar: Directive<HTMLElement, OverlayScrollbarOptions | undefined> = {
  mounted(element, { value }) {
    scrollbars.set(element, attachOverlayScrollbar(element, value));
  },
  updated(element, { value, oldValue }) {
    // Re-attaches only when the options change, not on every update of the component
    if (JSON.stringify(value) !== JSON.stringify(oldValue)) {
      scrollbars.get(element)?.destroy();
      scrollbars.set(element, attachOverlayScrollbar(element, value));
    }
  },
  unmounted(element) {
    scrollbars.get(element)?.destroy();
    scrollbars.delete(element);
  }
};
