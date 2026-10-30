import { attachOverlayScrollbar, type OverlayScrollbarOptions } from '@emmettito/overlay-scrollbar';
import { useEffect, useState } from 'react';

/**
 * Draws overlay scrollbars on the element the returned ref is given to. A callback ref, so it also attaches to an
 * element rendered later, e.g. under a condition, and to a new one that replaces it.
 */
export function useOverlayScrollbar<T extends HTMLElement>(
  options: OverlayScrollbarOptions = {}
): (element: T | null) => void {
  const [element, setElement] = useState<T | null>(null);
  // Compared by value, in any key order, so an options object created on every render doesn't re-attach the bars each
  // time
  const key = JSON.stringify(options, Object.keys(options).sort());

  useEffect(() => {
    if (!element) {
      return;
    }
    const scrollbar = attachOverlayScrollbar(element, JSON.parse(key));
    return () => scrollbar.destroy();
  }, [element, key]);

  return setElement;
}
