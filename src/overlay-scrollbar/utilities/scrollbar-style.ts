// Kept, with the probe and the listeners below, only while something watches (watchScrollbarStyle): the last one
// stopping removes them all, so nothing is left in the document once no element has bars
let classicScrollbars: boolean | undefined;
let probe: HTMLElement | undefined;
let probeObserver: ResizeObserver | undefined;
let finePointerQuery: MediaQueryList | undefined;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach(listener => listener());

// A hidden box with scrollbars: its content box resizes when the platform switches scrollbar style (e.g. macOS's
// "Show scroll bars" setting, or a mouse being plugged in). In the root element when attached from a script in the
// <head>, before there's a body.
function createProbe(): HTMLElement {
  const box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText =
    'position:fixed;top:0;left:-200px;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none';
  (document.body ?? document.documentElement).appendChild(box);
  return box;
}

const measureClassicScrollbars = (box: HTMLElement): boolean => box.offsetWidth > box.clientWidth;

function startWatching(): void {
  probe = createProbe();
  probeObserver = new ResizeObserver(() => {
    const was = classicScrollbars;
    classicScrollbars = probe ? measureClassicScrollbars(probe) : undefined;
    if (was !== undefined && classicScrollbars !== was) {
      notify();
    }
  });
  probeObserver.observe(probe);
  finePointerQuery = matchMedia('(any-pointer: fine)');
  finePointerQuery.addEventListener('change', notify);
}

function stopWatching(): void {
  probeObserver?.disconnect();
  probe?.remove();
  finePointerQuery?.removeEventListener('change', notify);
  probeObserver = undefined;
  probe = undefined;
  finePointerQuery = undefined;
  classicScrollbars = undefined;
}

/** Whether the platform's scrollbars take up space, i.e. don't overlay the content. */
export function hasClassicScrollbars(): boolean {
  if (probe) {
    classicScrollbars ??= measureClassicScrollbars(probe);
    return classicScrollbars;
  }
  // Nothing watching: measured with a probe of its own, gone again at once
  const box = createProbe();
  const result = measureClassicScrollbars(box);
  box.remove();
  return result;
}

// A mouse or trackpad; plugging one into a tablet attaches the bars
function hasFinePointer(): boolean {
  return (finePointerQuery ?? matchMedia('(any-pointer: fine)')).matches;
}

/**
 * Whether attached elements get the bars drawn: with a mouse or trackpad, or where the platform's scrollbars take up
 * space.
 */
export function drawsOverlayScrollbars(): boolean {
  return hasFinePointer() || hasClassicScrollbars();
}

/** Calls `listener` when drawsOverlayScrollbars() may have changed; returns a function that stops it. */
export function watchScrollbarStyle(listener: () => void): () => void {
  if (!listeners.size) {
    startWatching();
  }
  listeners.add(listener);
  return () => {
    if (listeners.delete(listener) && !listeners.size) {
      stopWatching();
    }
  };
}
