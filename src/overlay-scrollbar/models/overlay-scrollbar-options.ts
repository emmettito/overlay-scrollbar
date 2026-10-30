export interface OverlayScrollbarOptions {
  /** Draws the bars even on touch-only devices whose own scrollbars overlay the content. */
  force?: boolean;
  /**
   * When the bars hide. true: until scrolling or the pointer shows them, then after a moment. 'leave': they show while
   * the pointer is on the element, and fade out once it leaves. false: never. Default true.
   */
  autoHide?: boolean | 'leave';
  /** How long the pointer has to stay on a bar before it expands, in ms. Default 80. */
  hoverDelay?: number;
  /** How long a bar stays after scrolling stops, in ms. Default 700. */
  hideAfterScroll?: number;
  /** How long a bar stays after the pointer leaves it, in ms. Default 500. */
  hideAfterLeave?: number;
  /** The shortest a thumb gets, in px. Default 20. */
  minThumbLength?: number;
}

// Every option filled in
export type ResolvedOverlayScrollbarOptions = Required<OverlayScrollbarOptions>;
