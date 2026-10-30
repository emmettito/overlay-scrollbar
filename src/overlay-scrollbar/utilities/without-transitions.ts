/**
 * Applies `change` to `element` without its transitions, e.g. so a hidden bar appears at full opacity and width at
 * once. Reading offsetWidth forces a style recalculation while transitions are off, so the change is already applied
 * when they're turned back on and doesn't animate.
 */
export function withoutTransitions(element: HTMLElement, change: () => void): void {
  element.classList.add('overlay-scrollbar-no-transition');
  change();
  if (batched) {
    batched.push(element);
    return;
  }
  void element.offsetWidth;
  element.classList.remove('overlay-scrollbar-no-transition');
}

// The elements whose transitions are off until the batch running ends
let batched: HTMLElement[] | undefined;

/**
 * Runs `changes`, turning back on the transitions that withoutTransitions() turns off in them all after a single style
 * recalculation, rather than one each: in a batch of measurements, each one would otherwise lay out the page between
 * the others' writes.
 */
export function batchWithoutTransitions(changes: () => void): void {
  if (batched) {
    changes();
    return;
  }
  batched = [];
  try {
    changes();
  } finally {
    const elements = batched;
    batched = undefined;
    if (elements.length) {
      void elements[0].offsetWidth;
      elements.forEach(element => element.classList.remove('overlay-scrollbar-no-transition'));
    }
  }
}
