import { ResolvedOverlayScrollbarOptions } from './models/overlay-scrollbar-options.js';
import { OverlayScrollbarRef } from './models/overlay-scrollbar-ref.js';
import { OverlayScrollbarBar } from './overlay-scrollbar-bar.js';
import {
  Measurement,
  measureOnBorderBoxResize,
  measureOnResize,
  measureSoon,
  measureTogether,
  stopMeasuringOnBorderBoxResize,
  stopMeasuringOnResize
} from './utilities/measure-together.js';
import { measureThumb, overscroll, placeThumbOnTrack, ThumbSize } from './utilities/thumb-geometry.js';
import { thumbsUseScrollTimeline } from './utilities/thumbs-use-scroll-timeline.js';
import { watchDirection } from './utilities/watch-direction.js';

// The theming custom properties. The frame isn't inside the element to inherit any set on it, so they're copied across.
const THEME_PROPERTIES = [
  '--osb-width',
  '--osb-expanded-width',
  '--osb-inset',
  '--osb-radius',
  '--osb-thumb-color',
  '--osb-thumb-hover-color',
  '--osb-track-color',
  '--osb-corner',
  '--osb-fade-duration',
  '--osb-fade-in-duration',
  '--osb-idle-opacity',
  '--osb-expand-duration'
];

// Each frame's anchor name is numbered from one count that every copy of the library on the page shares, through the
// global symbol registry: two copies (two bundles, or a duplicated dependency) each counting from 1 would give two
// frames the same name, and a frame would anchor to the other copy's element
const frameCount = Symbol.for('@emmettito/overlay-scrollbar.frameCount');
function nextFrameName(): string {
  const shared = globalThis as typeof globalThis & Record<symbol, number | undefined>;
  shared[frameCount] = (shared[frameCount] ?? 0) + 1;
  return `--osb-${shared[frameCount]}`;
}

// Saves an inline style property as the page set it, returning what puts it back exactly: the bars set some inline,
// copying in any the stylesheet gives, and mustn't leave those behind
function saveInline(style: CSSStyleDeclaration, property: string): () => void {
  const value = style.getPropertyValue(property);
  const priority = style.getPropertyPriority(property);
  return () => (value ? style.setProperty(property, value, priority) : style.removeProperty(property));
}

// Adds names to a comma-separated list property (anchor-name, scroll-timeline-name, timeline-scope) set inline, keeping
// whatever the stylesheet already gives it. timeline-scope: all already covers every name.
function addNames(style: CSSStyleDeclaration, property: string, computed: string, names: string[]): void {
  const existing = style.getPropertyValue(property) || (computed === 'none' ? '' : computed);
  if (existing.trim() === 'all') {
    return;
  }
  style.setProperty(property, [existing, ...names].filter(Boolean).join(', '));
}

// Takes just those names out again, leaving any added by other elements' bars (several can share a parent)
function removeNames(style: CSSStyleDeclaration, property: string, names: string[]): void {
  const rest = style
    .getPropertyValue(property)
    .split(',')
    .map(name => name.trim())
    .filter(name => name && !names.includes(name));
  if (rest.length) {
    style.setProperty(property, rest.join(', '));
  } else {
    style.removeProperty(property);
  }
}

// A parent's timeline-scope as the page set it, while any of its children has bars: several can share a parent, and it
// goes back once the last of them is destroyed
const parentScopes = new WeakMap<HTMLElement, { restore: () => void; children: number }>();

/**
 * Draws the bars for `host` in a frame placed right after it, and laid over its visible area with CSS anchor
 * positioning. Being outside the element, the bars aren't part of its scrolling content, so no browser's bounce past
 * the ends moves them: Safari's, or Chrome's and Firefox's, which they don't report to the page. In Chromium the thumbs
 * follow the element's named scroll timelines on the compositor (visible to the frame through timeline-scope on the
 * parent); elsewhere the scroll listener moves them. Measuring is split into steps that only read or only write
 * (utilities/measure-together.ts), so elements attached together measure in two layouts.
 *
 * Sizes reach the stylesheet (overlay-scrollbar.css) as custom properties on the frame:
 * - --_osb-client-width/height: the frame's size, the element's visible area
 * - --_osb-border-top/left: the frame's offset from the element's border edge
 * - --_osb-thumb-x/y: thumb lengths
 * - --_osb-travel-x/y and --_osb-timeline-x/y: how far the thumbs move, and on which
 *   timelines, for Chromium's scroll-driven animations (negative x in RTL)
 * Elsewhere positionThumbs() sets each thumb's translate (and its length while rubber-banding) inline.
 */
export function drawOverlayScrollbarFrame(
  host: HTMLElement,
  options: ResolvedOverlayScrollbarOptions
): OverlayScrollbarRef {
  const name = nextFrameName();
  const frame = document.createElement('div');
  frame.className = 'overlay-scrollbar-frame';
  frame.classList.toggle('overlay-scrollbar-always', !options.autoHide);
  frame.setAttribute('aria-hidden', 'true');
  frame.style.setProperty('position-anchor', name);
  // What the last measurement read. Copied out of the computed style, which is live: reading it after another
  // element's writes would restyle the page.
  let direction = '';
  let theme: string[] = [];
  let scrollsX = false;
  let scrollsY = false;
  let depth = 0;
  let scrollWidth = 0;
  let scrollHeight = 0;
  let clientWidth = 0;
  let clientHeight = 0;
  let borderTop = 0;
  let borderLeft = 0;
  let trackX = 0;
  let trackY = 0;
  let thumbX: ThumbSize = { length: 0, travel: 0 };
  let thumbY: ThumbSize = { length: 0, travel: 0 };
  let rtl = false;
  let lastLeft = 0;
  let lastTop = 0;
  const barX = new OverlayScrollbarBar(
    host,
    false,
    options,
    () => thumbX.travel,
    () => rtl
  );
  const barY = new OverlayScrollbarBar(
    host,
    true,
    options,
    () => thumbY.travel,
    () => rtl
  );
  frame.append(barY.element, barX.element);

  // Chromium: the element's scroll timelines, named, and made visible beyond it to the frame, its next sibling
  const parent = host.parentElement;
  const timelines = thumbsUseScrollTimeline() && parent ? [`${name}-x`, `${name}-y`] : [];
  if (timelines.length) {
    frame.classList.add('overlay-scrollbar-scroll-timeline');
    frame.style.setProperty('--_osb-timeline-x', timelines[0]);
    frame.style.setProperty('--_osb-timeline-y', timelines[1]);
  }
  // The names are added in the first measurement, which reads the stylesheet's own names with the other elements'
  // reads: reading them here would restyle the page once per element attached, as each attach changes the styles
  let named = false;
  let anchorNames = '';
  let timelineNames = '';
  let timelineAxes = '';
  let timelineScope = '';
  const readNames = (hostStyle: CSSStyleDeclaration): void => {
    anchorNames = hostStyle.getPropertyValue('anchor-name');
    if (parent && timelines.length) {
      timelineNames = hostStyle.getPropertyValue('scroll-timeline-name');
      timelineAxes = hostStyle.getPropertyValue('scroll-timeline-axis');
      timelineScope = getComputedStyle(parent).getPropertyValue('timeline-scope');
    }
  };
  let restoreHostNames: (() => void)[] = [];
  const addAllNames = (): void => {
    named = true;
    restoreHostNames = ['anchor-name', 'scroll-timeline-name', 'scroll-timeline-axis'].map(property =>
      saveInline(host.style, property)
    );
    addNames(host.style, 'anchor-name', anchorNames, [name]);
    if (parent && timelines.length) {
      addNames(host.style, 'scroll-timeline-name', timelineNames, timelines);
      // One axis per name, in step with the names: the stylesheet's own timelines keep theirs
      const ownAxes = host.style.getPropertyValue('scroll-timeline-name').split(',').length - timelines.length;
      const pageAxes = timelineAxes.split(',');
      host.style.setProperty(
        'scroll-timeline-axis',
        // The stylesheet's axes repeat to match its names, as CSS does when it lists fewer axes than names
        [...Array.from({ length: ownAxes }, (_, i) => pageAxes[i % pageAxes.length]), 'x', 'y']
          .map(axis => axis.trim())
          .join(', ')
      );
      const scope = parentScopes.get(parent) ?? { restore: saveInline(parent.style, 'timeline-scope'), children: 0 };
      scope.children++;
      parentScopes.set(parent, scope);
      addNames(parent.style, 'timeline-scope', timelineScope, timelines);
    }
  };
  const restoreScrollbarWidth = saveInline(host.style, 'scrollbar-width');
  host.style.setProperty('scrollbar-width', 'none');
  host.classList.add('overlay-scrollbar-host');
  host.after(frame);

  const customProperties = new Map<string, string>();
  const setCustomProperty = (property: string, value: string): void => {
    if (customProperties.get(property) !== value) {
      customProperties.set(property, value);
      frame.style.setProperty(property, value);
    }
  };
  const canScroll = (overflow: string): boolean => overflow === 'auto' || overflow === 'scroll';

  // With autoHide 'leave': whether the pointer is on the element, and holding the bars there
  let pointerOn = false;
  const holdShownBars = (): void => {
    for (const bar of [barX, barY]) {
      if (!bar.element.hidden) {
        bar.hold(true);
      }
    }
  };

  // Destroyed bars ignore a measurement queued before they went (measureSoon), which would name the element again
  let destroyed = false;
  const measurement: Measurement = {
    read(): void {
      if (destroyed) {
        return;
      }
      const style = getComputedStyle(host);
      if (!named) {
        readNames(style);
      }
      direction = style.direction;
      rtl = direction === 'rtl';
      theme = THEME_PROPERTIES.map(property => style.getPropertyValue(property));
      scrollsX = canScroll(style.overflowX);
      scrollsY = canScroll(style.overflowY);
      // A nested scroller's bars go above those of the scrollers around it, which come later in the document and would
      // otherwise take the pointer where the bars overlap (a nested scroller flush with its parent's edge). This only
      // works while no stacking context (e.g. a transform or z-index) sits between the nested scroller and its parent.
      depth = 0;
      for (
        let ancestor = host.parentElement?.closest('.overlay-scrollbar-host');
        ancestor;
        ancestor = ancestor.parentElement?.closest('.overlay-scrollbar-host')
      ) {
        depth++;
      }
      scrollWidth = host.scrollWidth;
      scrollHeight = host.scrollHeight;
      clientWidth = host.clientWidth;
      clientHeight = host.clientHeight;
      // The borders: the native scrollbars are hidden, so none sits on the left in RTL
      borderTop = host.clientTop;
      borderLeft = host.clientLeft;
    },
    apply(): void {
      if (destroyed) {
        return;
      }
      if (!named) {
        addAllNames();
      }
      // The frame takes the element's direction and theme, which it doesn't inherit from it
      frame.style.direction = direction;
      THEME_PROPERTIES.forEach((property, index) => {
        const value = theme[index];
        if (value) {
          setCustomProperty(property, value);
        } else if (customProperties.delete(property)) {
          frame.style.removeProperty(property);
        }
      });
      barX.element.hidden = !(scrollsX && scrollWidth - clientWidth > 1);
      barY.element.hidden = !(scrollsY && scrollHeight - clientHeight > 1);
      frame.classList.toggle('overlay-scrollbar-both', !barX.element.hidden && !barY.element.hidden);
      setCustomProperty('--_osb-depth', String(depth));
      setCustomProperty('--_osb-client-width', `${clientWidth}px`);
      setCustomProperty('--_osb-client-height', `${clientHeight}px`);
      setCustomProperty('--_osb-border-top', `${borderTop}px`);
      setCustomProperty('--_osb-border-left', `${borderLeft}px`);
    },
    // The stylesheet sets the track lengths from the inset and the corner gap, so they're measured. By default, both
    // bars run to the corner and overlap there; with autoHide off they leave room for each other.
    readTracks(): void {
      if (destroyed) {
        return;
      }
      trackX = barX.element.clientWidth;
      trackY = barY.element.clientHeight;
      lastLeft = host.scrollLeft;
      lastTop = host.scrollTop;
    },
    applyThumbs(): void {
      if (destroyed) {
        return;
      }
      thumbX = measureThumb(trackX, clientWidth, scrollWidth, options.minThumbLength);
      thumbY = measureThumb(trackY, clientHeight, scrollHeight, options.minThumbLength);
      setCustomProperty('--_osb-thumb-x', `${thumbX.length}px`);
      setCustomProperty('--_osb-thumb-y', `${thumbY.length}px`);
      setCustomProperty('--_osb-travel-x', `${(rtl ? -1 : 1) * thumbX.travel}px`);
      setCustomProperty('--_osb-travel-y', `${thumbY.travel}px`);
      positionThumbs(lastLeft, lastTop);
      if (!options.autoHide) {
        for (const bar of [barX, barY]) {
          if (!bar.element.hidden) {
            bar.keepShowing();
          }
        }
      } else if (pointerOn) {
        // Content that grows to scroll under a resting pointer (e.g. typing) brings up its bar at once
        holdShownBars();
      }
    }
  };
  const update = (): void => measureTogether([measurement]);

  // The thumb shortens while rubber-banding, which needs a scroll position past the ends. Only Safari reports one.
  const placeThumb = (bar: OverlayScrollbarBar, vertical: boolean, position: number, maxScroll: number): void => {
    const overscrollDistance = overscroll(position, maxScroll);
    const { length, offset } = placeThumbOnTrack(
      position,
      maxScroll,
      overscrollDistance,
      vertical ? clientHeight : clientWidth,
      vertical ? trackY : trackX,
      vertical ? thumbY : thumbX,
      options.minThumbLength
    );
    bar.thumb.style[vertical ? 'height' : 'width'] = overscrollDistance ? `${length}px` : '';
    bar.thumb.style.translate = vertical ? `0 ${offset}px` : `${(rtl ? -1 : 1) * offset}px 0`;
  };

  // Only writes, from the scroll position and the last measurement
  const positionThumbs = (left: number, top: number): void => {
    if (timelines.length) {
      return;
    }
    // Distance from the start, also in RTL, where scrollLeft runs from 0 down to -maxLeft
    placeThumb(barX, false, rtl ? -left : left, Math.max(0, scrollWidth - clientWidth));
    placeThumb(barY, true, top, Math.max(0, scrollHeight - clientHeight));
  };

  // Re-measures what no ResizeObserver sees, whenever the bars are about to show: the direction changing (e.g.
  // switching to a right-to-left language), and content changing size deeper down than the element's children (e.g.
  // rows widening inside a virtual list's wrapper)
  const updateIfStale = (): void => {
    if (
      (getComputedStyle(host).direction === 'rtl') !== rtl ||
      host.scrollWidth !== scrollWidth ||
      host.scrollHeight !== scrollHeight
    ) {
      update();
    }
  };
  frame.addEventListener('pointerover', updateIfStale);
  // A dir attribute changing may change the direction of every element with bars: they're measured together
  const unwatchDirection = watchDirection(() => measureSoon(measurement));

  // Reads everything first, then writes: reading the scroll position or sizes after a write would make the browser lay
  // out the page in the middle of the handler, every frame of a scroll. The direction isn't checked here; a dir
  // attribute changing is watched for, and the pointer coming onto the bars checks it.
  const onScroll = (): void => {
    const left = host.scrollLeft;
    const top = host.scrollTop;
    // From before any measurement below, which reads the new position: a scroll that comes with a change in size (e.g.
    // a chat log scrolling to new messages) still shows its bar
    const previousLeft = lastLeft;
    const previousTop = lastTop;
    if (host.scrollWidth !== scrollWidth || host.scrollHeight !== scrollHeight) {
      update();
    }
    positionThumbs(left, top);
    if (left !== previousLeft && !barX.element.hidden) {
      barX.show(options.hideAfterScroll);
    }
    if (top !== previousTop && !barY.element.hidden) {
      barY.show(options.hideAfterScroll);
    }
    lastLeft = left;
    lastTop = top;
  };
  host.addEventListener('scroll', onScroll, { passive: true });

  // With autoHide 'leave', the bars fade in when the pointer comes onto the element, so they're easy to find, and stay
  // until it leaves. Not for touch. The bars are outside the element, so the pointer moving between the two isn't
  // leaving, and coming straight onto the bars is arriving.
  const onPointerEnter = (event: PointerEvent): void => {
    if (options.autoHide !== 'leave' || event.pointerType === 'touch') {
      return;
    }
    pointerOn = true;
    updateIfStale();
    holdShownBars();
  };
  const onPointerLeave = (event: PointerEvent): void => {
    const to = event.relatedTarget as Node | null;
    if (options.autoHide !== 'leave' || event.pointerType === 'touch' || host.contains(to) || frame.contains(to)) {
      return;
    }
    pointerOn = false;
    barX.hold(false);
    barY.hold(false);
  };
  for (const target of [host, frame]) {
    target.addEventListener('pointerenter', onPointerEnter);
    target.addEventListener('pointerleave', onPointerLeave);
  }

  // Content size changes show up as a resize of the element or one of its children. The first notification, once the
  // element has rendered, is its first measurement. A nested element's frame is left out: it's absolutely positioned,
  // so it never changes the content's size, and it resizes whenever that element is measured. As children come and
  // go, only those are observed or let go, so a long list growing a row at a time stays cheap.
  const observed = new Set<Element>();
  const observe = (element: Element): void => {
    if (!observed.has(element) && !element.classList.contains('overlay-scrollbar-frame')) {
      observed.add(element);
      measureOnResize(element, measurement);
    }
  };
  const stopObserving = (element: Element): void => {
    if (observed.delete(element)) {
      stopMeasuringOnResize(element, measurement);
    }
  };
  const mutationObserver = new MutationObserver(records => {
    // A child that's gone no longer reports a resize, and text has no size of its own to report: either can change the
    // content's size with nothing else resizing (e.g. a list emptied, or a <pre>'s text replaced, in an element of
    // fixed size), so the element is measured, together with any others this happened to at once
    let measure = false;
    for (const record of records) {
      record.removedNodes.forEach(node => {
        if (node instanceof Element && node.parentNode !== host && observed.has(node)) {
          stopObserving(node);
          measure = true;
        } else if (node.nodeType === Node.TEXT_NODE) {
          measure = true;
        }
      });
      record.addedNodes.forEach(node => {
        if (node instanceof Element && node.parentNode === host) {
          observe(node);
        } else if (node.nodeType === Node.TEXT_NODE) {
          measure = true;
        }
      });
    }
    if (measure) {
      measureSoon(measurement);
    }
  });
  mutationObserver.observe(host, { childList: true });
  [host, ...Array.from(host.children)].forEach(observe);
  measureOnBorderBoxResize(host, measurement);

  return {
    update,
    destroy(): void {
      destroyed = true;
      host.removeEventListener('scroll', onScroll);
      for (const target of [host, frame]) {
        target.removeEventListener('pointerenter', onPointerEnter);
        target.removeEventListener('pointerleave', onPointerLeave);
      }
      observed.forEach(element => stopMeasuringOnResize(element, measurement));
      stopMeasuringOnBorderBoxResize(host);
      mutationObserver.disconnect();
      barX.destroy();
      barY.destroy();
      unwatchDirection();
      frame.remove();
      host.classList.remove('overlay-scrollbar-host');
      restoreScrollbarWidth();
      if (!named) {
        return;
      }
      restoreHostNames.forEach(restore => restore());
      const scope = parent && parentScopes.get(parent);
      if (parent && scope && timelines.length) {
        removeNames(parent.style, 'timeline-scope', timelines);
        if (--scope.children === 0) {
          scope.restore();
          parentScopes.delete(parent);
        }
      }
    }
  };
}
