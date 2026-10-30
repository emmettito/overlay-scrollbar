import { batchWithoutTransitions } from './without-transitions.js';

/**
 * One element's measurement, split into steps that each only write styles or only read layout. Run one element at a
 * time, every read after a write makes the browser lay out the page there and then; run together, all the writes come
 * before all the reads, so any number of elements costs two layouts (and one style recalculation more when bars appear
 * without transitions; see without-transitions.ts).
 */
export interface Measurement {
  /** Read: the element's sizes, borders, direction and theme */
  read(): void;
  /** Write: those, as custom properties for the stylesheet */
  apply(): void;
  /** Read: the track lengths the stylesheet gave the bars, and the scroll position */
  readTracks(): void;
  /** Write: the thumbs, sized and placed */
  applyThumbs(): void;
}

export function measureTogether(measurements: Iterable<Measurement>): void {
  const all = [...new Set(measurements)];
  all.forEach(measurement => measurement.read());
  all.forEach(measurement => measurement.apply());
  all.forEach(measurement => measurement.readTracks());
  // Bars brought up here (autoHide off, or a resting pointer) appear without transitions, which takes a style
  // recalculation: one for them all, after every write, rather than one each in between
  batchWithoutTransitions(() => all.forEach(measurement => measurement.applyThumbs()));
}

// Measurements asked for since the last microtask, measured together then (see measureSoon)
let soon: Set<Measurement> | undefined;

/**
 * Measures `measurement` once the current task's changes are done, together with every other asked for meanwhile:
 * e.g. on a change of direction, which every element with bars hears about at once.
 */
export function measureSoon(measurement: Measurement): void {
  if (!soon) {
    soon = new Set();
    queueMicrotask(() => {
      const measurements = soon ?? [];
      soon = undefined;
      measureTogether(measurements);
    });
  }
  soon.add(measurement);
}

// One ResizeObserver for every attached element, so everything that resized in a frame (e.g. every element attached in
// it, or all of them when the window resizes) is measured together. Its first notification for an element is that
// element's first measurement. An element can be watched for several measurements: a nested element for its own, and
// as a child of the element around it for that one's.
let observer: ResizeObserver | undefined;
const measurementsOf = new Map<Element, Set<Measurement>>();

/** Measures `measurement` whenever `element` resizes, starting once it has rendered. */
export function measureOnResize(element: Element, measurement: Measurement): void {
  observer ??= new ResizeObserver(entries =>
    measureTogether(entries.flatMap(entry => [...(measurementsOf.get(entry.target) ?? [])]))
  );
  const measurements = measurementsOf.get(element);
  if (measurements) {
    if (!measurements.has(measurement)) {
      measurements.add(measurement);
      // Observed already (e.g. a nested element, as a child of the element around it): observed again, so the new
      // measurement gets a first notification of its own, rather than waiting for a resize that may never come
      observer.unobserve(element);
      observer.observe(element);
    }
  } else {
    measurementsOf.set(element, new Set([measurement]));
    observer.observe(element);
  }
}

/** Stops measuring `measurement` when `element` resizes, leaving any other measurement watching it. */
export function stopMeasuringOnResize(element: Element, measurement: Measurement): void {
  const measurements = measurementsOf.get(element);
  measurements?.delete(measurement);
  if (measurements?.size === 0) {
    measurementsOf.delete(element);
    observer?.unobserve(element);
  }
}

// The elements with bars are watched by their border box too. The bars cover the padding box, which can change
// without the content box: with box-sizing: content-box and a fixed size, a change of padding or border grows only
// the border box. (With box-sizing: border-box, padding doesn't move the bars, and a border change shrinks the content
// box.) The first notification for each is skipped, as the content box's measures it already.
let borderBoxObserver: ResizeObserver | undefined;
const borderBoxMeasurementOf = new Map<Element, Measurement>();
const notifiedOnce = new WeakSet<Element>();

/** Also measures `measurement` whenever `element`'s border box resizes, from the first resize after it renders. */
export function measureOnBorderBoxResize(element: Element, measurement: Measurement): void {
  borderBoxObserver ??= new ResizeObserver(entries =>
    measureTogether(
      entries.flatMap(({ target }) => {
        const measurement = borderBoxMeasurementOf.get(target);
        if (!measurement || !notifiedOnce.has(target)) {
          notifiedOnce.add(target);
          return [];
        }
        return [measurement];
      })
    )
  );
  borderBoxMeasurementOf.set(element, measurement);
  notifiedOnce.delete(element);
  borderBoxObserver.observe(element, { box: 'border-box' });
}

export function stopMeasuringOnBorderBoxResize(element: Element): void {
  borderBoxMeasurementOf.delete(element);
  notifiedOnce.delete(element);
  borderBoxObserver?.unobserve(element);
}
