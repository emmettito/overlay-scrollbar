export interface OverlayScrollbarRef {
  /** Re-measures; call after a size change that no ResizeObserver can see (e.g. an absolutely positioned child). */
  update(): void;
  /** Removes the bars and their listeners, and restores the element's own scrollbars. */
  destroy(): void;
}
