let result: boolean | undefined;

/**
 * Whether the browser has CSS anchor positioning (Chrome 125, Safari 26, Firefox 147), which lays the bars' frame over
 * the element. Without it the bars aren't drawn, and the element keeps its own scrollbars. Environments without
 * CSS.supports at all (jsdom in tests) count as having it.
 */
export function supportsAnchorPositioning(): boolean {
  result ??=
    typeof CSS === 'undefined' ||
    typeof CSS.supports !== 'function' ||
    CSS.supports('anchor-name: --overlay-scrollbar');
  return result;
}
