const listeners = new Set<() => void>();
let observer: MutationObserver | undefined;

/**
 * Calls `listener` when a dir attribute changes anywhere (e.g. switching to a right-to-left language), which may change
 * an attached element's direction; Firefox doesn't fire a scroll event when that resets the scroll position. One
 * observer serves every attached element. Returns a function that stops it.
 */
export function watchDirection(listener: () => void): () => void {
  if (!observer) {
    observer = new MutationObserver(() => listeners.forEach(listener => listener()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'], subtree: true });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}
