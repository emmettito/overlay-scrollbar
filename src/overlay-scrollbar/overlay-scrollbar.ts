/*
  Overlay scrollbars, drawn wherever there's a mouse or trackpad. How to use and theme them is in README.md; this is
  how they work.

  Scrolling stays native: the element keeps overflow:auto and only its scrollbars are hidden. The bars are drawn in a
  frame placed right after the element and laid over it with CSS anchor positioning (overlay-scrollbar-frame.ts), each
  bar handling its own timing and pointer input (overlay-scrollbar-bar.ts). Measurements and thumb maths are in
  utilities/. Browsers without anchor positioning keep their own scrollbars.

  They're drawn even where the platform's own scrollbars overlay the content, so they look and behave the same
  everywhere: macOS picks its scrollbar style from what's connected rather than what's in use, so a MacBook with a
  mouse may show either. Touch-only devices (phones, tablets) keep their own overlay scrollbars unless those take up
  space. Attached elements follow changes to either while the page is open.

  The default sizes, colours and timings are defined in overlay-scrollbar.css and models/constants.ts. The less obvious
  choices are explained where they're made:
  - why the bars are drawn outside the element, so no browser's bounce moves them: overlay-scrollbar-frame.ts
  - the contained frame that keeps Safari's keyboard rubber-band working: .overlay-scrollbar-frame in the stylesheet
  - why WebKit moves the thumbs from a scroll listener: utilities/thumbs-use-scroll-timeline.ts
  Known limits are listed in README.md.
*/
import { OverlayScrollbarOptions } from './models/overlay-scrollbar-options.js';
import { OverlayScrollbarRef } from './models/overlay-scrollbar-ref.js';
import { drawOverlayScrollbarFrame } from './overlay-scrollbar-frame.js';
import { supportsAnchorPositioning } from './utilities/anchor-positioning.js';
import { resolveOptions } from './utilities/resolve-options.js';
import { drawsOverlayScrollbars, watchScrollbarStyle } from './utilities/scrollbar-style.js';
import { whenConnected } from './utilities/when-connected.js';

// Each element's bars, so attaching again replaces them rather than drawing a second set
const attached = new WeakMap<HTMLElement, OverlayScrollbarRef>();

/**
 * Draws overlay scrollbars on a scrollable element, while drawsOverlayScrollbars() (or `force`), in
 * browsers with CSS anchor positioning. Attaching again to the same element replaces its bars, and an element not yet
 * in the page gets them once it's added. Does nothing during server-side rendering, or on the page itself (see
 * scrollsThePage()).
 */
export function attachOverlayScrollbar(host: HTMLElement, options: OverlayScrollbarOptions = {}): OverlayScrollbarRef {
  if (typeof document === 'undefined' || scrollsThePage(host)) {
    return { update: () => undefined, destroy: () => undefined };
  }
  attached.get(host)?.destroy();
  const resolved = resolveOptions(options);
  let frame: OverlayScrollbarRef | undefined;
  let stopWaiting: (() => void) | undefined;
  const sync = (): void => {
    const draw = supportsAnchorPositioning() && (resolved.force || drawsOverlayScrollbars());
    if (draw && !frame) {
      // The frame goes next to the element, so it waits until the element is in the page
      if (host.isConnected) {
        frame = drawOverlayScrollbarFrame(host, resolved);
      } else {
        stopWaiting ??= whenConnected(host, () => {
          stopWaiting = undefined;
          sync();
        });
      }
    } else if (!draw && frame) {
      frame.destroy();
      frame = undefined;
    }
  };
  const unwatch = resolved.force ? undefined : watchScrollbarStyle(sync);
  let destroyed = false;
  const ref: OverlayScrollbarRef = {
    update: () => frame?.update(),
    destroy(): void {
      // Also called by attaching again: whichever comes second does nothing
      if (destroyed) {
        return;
      }
      destroyed = true;
      if (attached.get(host) === ref) {
        attached.delete(host);
      }
      unwatch?.();
      stopWaiting?.();
      frame?.destroy();
      frame = undefined;
    }
  };
  attached.set(host, ref);
  sync();
  return ref;
}

/**
 * Whether `host`'s scrolling is the page's: the viewport's, which has no element to draw the bars next to. That's the
 * root element's, and the body's too while the root's overflow is visible, as the body's overflow then goes to the
 * viewport. A body that scrolls by itself, under a root with overflow hidden, is an element like any other.
 */
function scrollsThePage(host: HTMLElement): boolean {
  if (host === document.documentElement) {
    return true;
  }
  if (host !== document.body) {
    return false;
  }
  const root = getComputedStyle(document.documentElement);
  return root.overflowX === 'visible' && root.overflowY === 'visible';
}

/**
 * Attaches to every element matching `selector` under `root` (default: the body, or the whole document when called
 * from the <head>, before there's a body), now and as they're added, and detaches as they're removed. Returns a
 * function that stops it and detaches them all.
 */
export function autoAttachOverlayScrollbars(
  selector: string,
  root?: HTMLElement,
  options: OverlayScrollbarOptions = {}
): () => void {
  if (typeof document === 'undefined') {
    return () => undefined;
  }
  root ??= document.body ?? document.documentElement;
  const refs = new Map<HTMLElement, OverlayScrollbarRef>();
  let stopped = false;
  const scan = (): void => {
    // A scan queued just before stop() mustn't attach again bars nothing could then destroy
    if (stopped) {
      return;
    }
    for (const [element, ref] of refs) {
      if (!element.isConnected || !element.matches(selector)) {
        ref.destroy();
        refs.delete(element);
      }
    }
    for (const element of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
      // Attached where nothing has bars now: also where other bars replaced these and were destroyed in turn (another
      // selector matching the element, or attachOverlayScrollbar() on it). Bars something else attached are left alone.
      if (!refs.has(element) || !attached.has(element)) {
        refs.set(element, attachOverlayScrollbar(element, options));
      }
    }
  };
  // The bars' own changes (the frames coming and going, their classes) can't make an element match or stop matching
  const isFrame = (node: Node): boolean =>
    node instanceof Element && node.classList.contains('overlay-scrollbar-frame');
  const mightChangeMatches = (record: MutationRecord): boolean =>
    !(record.target instanceof Element && record.target.closest('.overlay-scrollbar-frame')) &&
    (record.type !== 'childList' || [...record.addedNodes, ...record.removedNodes].some(node => !isFrame(node)));
  let queued = false;
  const observer = new MutationObserver(records => {
    if (!queued && records.some(mightChangeMatches)) {
      queued = true;
      queueMicrotask(() => {
        queued = false;
        scan();
      });
    }
  });
  // The attributes the selector can depend on: class, id, and any it names, e.g. [data-scroll], in lower case as HTML
  // has them whatever case the selector uses. Not style, which the bars set on the element, and other attributes change
  // all the time without changing what matches. A name escaped in the selector isn't read: then every attribute is.
  const named = Array.from(selector.matchAll(/\[\s*(?:[\w*-]*\|)?([\w-]+)/g), match => match[1].toLowerCase());
  const attributeFilter = selector.includes('\\') ? undefined : ['class', 'id', ...named];
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter });
  scan();
  return () => {
    stopped = true;
    observer.disconnect();
    refs.forEach(ref => ref.destroy());
    refs.clear();
  };
}
