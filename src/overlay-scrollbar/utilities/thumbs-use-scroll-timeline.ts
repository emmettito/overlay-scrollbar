let result: boolean | undefined;

/**
 * Whether the thumbs follow the scroll position with scroll-driven animations (on the compositor) rather than a scroll
 * listener. WebKit doesn't keep scroll-driven animations in step with wheel, keyboard and scripted scrolling.
 * Checked on first use rather than on import, so importing the library is safe during server-side rendering.
 *
 * WebKit is told apart by its vendor rather than a feature check: it supports scroll-driven animations, so
 * CSS.supports() says yes. It runs them on the main thread until threaded animation resolution lands, which is likely
 * why they fall behind its threaded scrolling (https://bugs.webkit.org/show_bug.cgi?id=250970, from the scroll-driven
 * animations tracker https://bugs.webkit.org/show_bug.cgi?id=222295). Recheck with each Safari release: once the
 * thumbs keep up with wheel, keyboard and scripted scrolling without the vendor check, drop it.
 */
export function thumbsUseScrollTimeline(): boolean {
  result ??=
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: scroll()') &&
    navigator.vendor !== 'Apple Computer, Inc.';
  return result;
}
