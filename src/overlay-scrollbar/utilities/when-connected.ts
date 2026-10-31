// The elements waiting, held weakly, so waiting doesn't itself keep one from being garbage collected. Each one's
// callback is kept only as long as the element itself. The bars usually keep it anyway until they're destroyed (e.g.
// through watchScrollbarStyle's listeners), so one dropped without destroy() is kept, and checked every frame, for good.
const waiting = new Set<WeakRef<Element>>();
const waitingFor = new WeakMap<Element, { ref: WeakRef<Element>; callback: () => void }>();
let observer: MutationObserver | undefined;
let frame: number | undefined;

/**
 * Calls `callback` once `element` is in the page, e.g. one attached to before it's added: its bars are drawn in a frame
 * placed next to it, which needs a parent. An observer of the document sees it added there at once; a check every frame
 * sees it added inside a shadow root, which the observer doesn't reach. They serve every element waiting. Returns a
 * function that stops waiting.
 */
export function whenConnected(element: Element, callback: () => void): () => void {
  const ref = new WeakRef(element);
  waiting.add(ref);
  waitingFor.set(element, { ref, callback });
  if (!observer) {
    observer = new MutationObserver(check);
    observer.observe(document, { childList: true, subtree: true });
  }
  everyFrame();
  return () => stopWaiting(ref);
}

function check(): void {
  for (const ref of waiting) {
    const element = ref.deref();
    if (!element) {
      // Garbage collected without ever being added
      stopWaiting(ref);
    } else if (element.isConnected) {
      const callback = waitingFor.get(element)?.callback;
      stopWaiting(ref);
      callback?.();
    }
  }
}

// One check a frame while anything waits, however often waiting starts and stops meanwhile
function everyFrame(): void {
  if (frame === undefined && typeof requestAnimationFrame === 'function') {
    frame = requestAnimationFrame(() => {
      frame = undefined;
      check();
      if (waiting.size) {
        everyFrame();
      }
    });
  }
}

function stopWaiting(ref: WeakRef<Element>): void {
  waiting.delete(ref);
  const element = ref.deref();
  if (element && waitingFor.get(element)?.ref === ref) {
    waitingFor.delete(element);
  }
  if (!waiting.size) {
    observer?.disconnect();
    observer = undefined;
    if (frame !== undefined) {
      cancelAnimationFrame(frame);
      frame = undefined;
    }
  }
}
