import {
  attachOverlayScrollbar,
  type OverlayScrollbarOptions,
  type OverlayScrollbarRef
} from '@emmettito/overlay-scrollbar';
import type { Directive } from 'vue';

const scrollbars = new WeakMap<HTMLElement, OverlayScrollbarRef>();

// The options by value, in any key order, with none the same as {} (oldValue is null on the first update)
const keyOf = (options: OverlayScrollbarOptions | null = {}): string =>
  JSON.stringify(options ?? {}, Object.keys(options ?? {}).sort());

/** Draws overlay scrollbars on the element: `v-overlay-scrollbar="options"`. */
export const vOverlayScrollbar: Directive<HTMLElement, OverlayScrollbarOptions | undefined> = {
  mounted(element, { value }) {
    scrollbars.set(element, attachOverlayScrollbar(element, value));
  },
  updated(element, { value, oldValue }) {
    // Re-attaches only when the options change, not on every update of the component
    if (keyOf(value) !== keyOf(oldValue)) {
      scrollbars.get(element)?.destroy();
      scrollbars.set(element, attachOverlayScrollbar(element, value));
    }
  },
  unmounted(element) {
    scrollbars.get(element)?.destroy();
    scrollbars.delete(element);
  }
};
