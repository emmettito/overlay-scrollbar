import { ResolvedOverlayScrollbarOptions } from './models/overlay-scrollbar-options.js';
import { jumpToSpot, pageTowards } from './utilities/track-click.js';
import { withoutTransitions } from './utilities/without-transitions.js';

// On a Mac, Control-click is a right-click: it opens the context menu, though it comes with the main button. Read at
// each press rather than once, so the specs can stand in for a Mac.
const controlClickIsRightClick = (): boolean => /^Mac/.test(navigator.platform);

/** One scrollbar: its show/hide timing, hover expansion and pointer handling (thumb drag, track clicks). */
export class OverlayScrollbarBar {
  private dragging = false;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  // Kept showing while the pointer is on the element (autoHide 'leave')
  private holding = false;
  private hovering = false;
  private hoverTimer: ReturnType<typeof setTimeout> | undefined;
  // The pointers on the bar, other than touches: a mouse and a pen can both be
  private readonly pointersOn = new Set<number>();
  private visible = false;
  public readonly element = document.createElement('div');
  public readonly thumb = document.createElement('div');

  /**
   * `getTravel` and `isReversed` (whether the bar's axis scrolls from 0 down, see utilities/scroll-axes.ts) are read
   * as the pointer uses them, not passed as values, because the frame re-measures them whenever the element or its
   * content resizes, or it changes direction or writing mode.
   */
  constructor(
    private host: HTMLElement,
    private vertical: boolean,
    private options: ResolvedOverlayScrollbarOptions,
    private getTravel: () => number,
    private isReversed: () => boolean
  ) {
    this.element.className = `overlay-scrollbar-bar overlay-scrollbar-bar-${vertical ? 'y' : 'x'}`;
    this.element.hidden = true;
    this.thumb.className = 'overlay-scrollbar-thumb';
    this.element.appendChild(this.thumb);
    this.element.addEventListener('pointerenter', this.onPointerEnter);
    this.element.addEventListener('pointerleave', this.onPointerLeave);
    this.element.addEventListener('pointerdown', this.onPointerDown);
    this.element.addEventListener('contextmenu', this.onContextMenu);
  }

  public destroy(): void {
    this.pointersOn.clear();
    clearTimeout(this.hideTimer);
    clearTimeout(this.hoverTimer);
  }

  /**
   * Keeps the bar showing, fading it in, while the pointer is on the element (autoHide 'leave'); letting go fades it out
   * after hideAfterLeave.
   */
  public hold(holding: boolean): void {
    if (holding === this.holding) {
      return;
    }
    this.holding = holding;
    if (holding) {
      this.show(this.options.hideAfterLeave, true);
    } else if (this.visible) {
      // Starts the fade-out timer
      this.show(this.options.hideAfterLeave);
    }
  }

  /** Shows a bar that autoHide is off for, without bringing it to the front. */
  public keepShowing(): void {
    if (!this.visible) {
      this.appear(false);
    }
  }

  /**
   * Shows the bar, in front of the other one, as it's the one in use; it fades out again after `hideAfter` ms unless
   * the pointer is on it or autoHide is off. It appears at once, or with `fadeIn`, fades in.
   */
  public show(hideAfter: number, fadeIn = false): void {
    clearTimeout(this.hideTimer);
    for (const bar of Array.from(this.element.parentElement?.children ?? [])) {
      bar.classList.toggle('overlay-scrollbar-front', bar === this.element);
    }
    const expanded = this.hovering || this.dragging;
    // toggle() with a force leaves the class attribute alone when nothing changes, unlike add() and remove(), so
    // scrolling with the bars showing doesn't wake up MutationObservers (autoAttachOverlayScrollbars) every frame
    if (!this.visible) {
      this.appear(expanded, fadeIn);
    } else if (expanded) {
      this.element.classList.toggle('overlay-scrollbar-expanded', true);
    } else if (!this.options.autoHide || this.holding) {
      // A bar that's about to fade out does so still expanded; one that stays shrinks back now
      this.element.classList.toggle('overlay-scrollbar-expanded', false);
    }
    if (!expanded && this.options.autoHide && !this.holding) {
      this.hideTimer = setTimeout(() => this.hide(), hideAfter);
    }
  }

  // Appears at its final width, however it was left: at once, or fading in from wherever its opacity is
  private appear(expanded: boolean, fadeIn = false): void {
    this.visible = true;
    withoutTransitions(this.element, () => {
      this.element.classList.toggle('overlay-scrollbar-expanded', expanded);
      if (!fadeIn) {
        this.element.classList.remove('overlay-scrollbar-fade-in');
        this.element.classList.add('overlay-scrollbar-visible');
      }
    });
    if (fadeIn) {
      this.element.classList.add('overlay-scrollbar-fade-in', 'overlay-scrollbar-visible');
    }
  }

  private drag(downEvent: PointerEvent, pointerPosition: (event: PointerEvent) => number): void {
    const scrollProperty = this.vertical ? 'scrollTop' : 'scrollLeft';
    this.dragging = true;
    this.element.classList.add('overlay-scrollbar-dragging');
    this.thumb.setPointerCapture(downEvent.pointerId);
    const startPosition = pointerPosition(downEvent);
    const startScroll = this.host[scrollProperty];
    // Only the pointer that started the drag moves it: a second finger or a pen on the bar meanwhile is ignored
    const move = (moveEvent: PointerEvent): void => {
      if (moveEvent.pointerId !== downEvent.pointerId) {
        return;
      }
      // Measured on each move, not once, as content loading during the drag (e.g. an endless list) changes both
      const maxScroll = this.vertical
        ? this.host.scrollHeight - this.host.clientHeight
        : this.host.scrollWidth - this.host.clientWidth;
      const travel = this.getTravel();
      if (travel > 0) {
        // Instant, as the thumb has to keep up with the pointer: scroll-behavior: smooth on the element would
        // otherwise start an animation on every move
        this.host.scrollTo({
          [this.vertical ? 'top' : 'left']:
            startScroll + ((pointerPosition(moveEvent) - startPosition) * maxScroll) / travel,
          behavior: 'instant'
        });
      }
    };
    // Ends on whichever comes first: capture is lost after pointerup and pointercancel, and also without either
    // whenever the browser releases it some other way (e.g. as the bar is hidden mid-drag, in browsers that release it
    // then), after which pointerup goes elsewhere
    const up = (upEvent: PointerEvent): void => {
      if (upEvent.pointerId !== downEvent.pointerId) {
        return;
      }
      this.dragging = false;
      this.element.classList.remove('overlay-scrollbar-dragging');
      this.thumb.removeEventListener('pointermove', move);
      this.thumb.removeEventListener('pointerup', up);
      this.thumb.removeEventListener('pointercancel', up);
      this.thumb.removeEventListener('lostpointercapture', up);
      // A touch leaves :hover stuck on the bar, so a touch drag ending counts as leaving it
      this.hovering = upEvent.pointerType !== 'touch' && this.element.matches(':hover');
      // Captured while dragging, a pointer that left the bar may not have said so
      if (!this.hovering) {
        this.pointersOn.delete(upEvent.pointerId);
      }
      if (!this.hovering) {
        this.show(this.options.hideAfterLeave);
      }
    };
    this.thumb.addEventListener('pointermove', move);
    this.thumb.addEventListener('pointerup', up);
    this.thumb.addEventListener('pointercancel', up);
    this.thumb.addEventListener('lostpointercapture', up);
  }

  // Fades out as a whole, still expanded. It's put back to the right width without a transition when it shows again.
  private hide(): void {
    this.visible = false;
    this.element.classList.remove('overlay-scrollbar-visible', 'overlay-scrollbar-fade-in');
  }

  // No context menu, as over native scrollbars: the page's would otherwise open over the bar
  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private onPointerDown = (event: PointerEvent): void => {
    // Only the main button, and not a Mac's Control-click, which is a right-click. A second pointer during a drag
    // neither pages nor starts another drag.
    if (event.button !== 0 || (event.ctrlKey && controlClickIsRightClick()) || this.dragging) {
      return;
    }
    event.preventDefault();
    // Expands at once, even if pressed before the hover delay is up
    this.startHover();
    const pointerPosition = (pointerEvent: PointerEvent): number =>
      this.vertical ? pointerEvent.clientY : pointerEvent.clientX;

    if (event.target !== this.thumb) {
      const thumbRect = this.thumb.getBoundingClientRect();
      if (event.altKey) {
        const trackRect = this.element.getBoundingClientRect();
        jumpToSpot(
          this.host,
          this.vertical,
          this.isReversed(),
          pointerPosition(event),
          trackRect,
          thumbRect,
          this.getTravel()
        );
      } else {
        pageTowards(this.host, this.vertical, pointerPosition(event), thumbRect);
      }
      // As at the end of a touch drag: a tap isn't hovering, and no pointerleave will say it stopped
      if (event.pointerType === 'touch') {
        this.hovering = false;
        this.show(this.options.hideAfterLeave);
      }
      return;
    }

    this.drag(event, pointerPosition);
  };

  // The hover delay starts with the first pointer onto the bar, and the hover lasts until the last one leaves
  private onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      return;
    }
    this.pointersOn.add(event.pointerId);
    if (this.pointersOn.size === 1) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = setTimeout(() => this.startHover(), this.options.hoverDelay);
    }
  };

  private onPointerLeave = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      return;
    }
    this.pointersOn.delete(event.pointerId);
    if (this.pointersOn.size) {
      return;
    }
    clearTimeout(this.hoverTimer);
    if (this.hovering) {
      this.hovering = false;
      if (!this.dragging) {
        this.show(this.options.hideAfterLeave);
      }
    }
  };

  private startHover(): void {
    clearTimeout(this.hoverTimer);
    this.hovering = true;
    this.show(0);
  }
}
