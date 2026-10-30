let result: boolean | undefined;

/**
 * Whether the thumbs follow the scroll position with scroll-driven animations (on the compositor) rather than a scroll
 * listener. WebKit doesn't keep scroll-driven animations in step with wheel, keyboard and scripted scrolling.
 * Checked on first use rather than on import, so importing the library is safe during server-side rendering.
 */
export function thumbsUseScrollTimeline(): boolean {
  result ??=
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: scroll()') &&
    navigator.vendor !== 'Apple Computer, Inc.';
  return result;
}
