import { OverlayScrollbarOptions } from '../overlay-scrollbar/models/overlay-scrollbar-options';
import { OverlayScrollbarRef } from '../overlay-scrollbar/models/overlay-scrollbar-ref';
import { attachOverlayScrollbar } from '../overlay-scrollbar/overlay-scrollbar';

/** One page of the app: renders into `main`, and returns what undoes it (e.g. destroys the bars it attached). */
export interface Page {
  title: string;
  render(main: HTMLElement): () => void;
}

/** Markup that `html` inserts as it is, rather than escaping it */
export class Html {
  constructor(public readonly value: string) {}

  public toString(): string {
    return this.value;
  }
}

/**
 * Builds markup from a template, escaping every value but Html (e.g. a nested html`…`). Arrays are joined, and
 * null, undefined and false are left out, so `${cond && html`…`}` and `${items.map(…)}` work.
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
  return new Html(strings.reduce((out, string, i) => out + string + (i < values.length ? markup(values[i]) : ''), ''));
}

function markup(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(markup).join('');
  }
  if (value instanceof Html) {
    return value.value;
  }
  if (value === null || value === undefined || value === false) {
    return '';
  }
  return String(value).replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
}

/**
 * The element under `root` matching `selector`, for elements the page's own markup puts there: throws, naming the
 * selector, if it's missing, rather than failing later on null.
 */
export function find<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Nothing matches ${selector}`);
  }
  return element;
}

/** Replaces `element`'s contents with `content` */
export function render(element: HTMLElement, content: Html): void {
  element.innerHTML = content.value;
}

// Every page's bars, which measure again when the theme changes: their colours come from custom properties, copied to
// the bars only when they measure, and switching the theme resizes nothing that would make them
const live = new Set<OverlayScrollbarRef>();
addEventListener('themechange', () => live.forEach(ref => ref.update()));

/** The bars a page has attached, to destroy when it goes */
export class Bars {
  private readonly refs: OverlayScrollbarRef[] = [];

  /**
   * Attaches the bars to `element`, forced on, so they draw even where the platform overlays its own scrollbars, for
   * comparing them side by side.
   */
  public attach(element: HTMLElement, options: OverlayScrollbarOptions = {}): OverlayScrollbarRef {
    const ref = attachOverlayScrollbar(element, { force: true, ...options });
    this.refs.push(ref);
    live.add(ref);
    return ref;
  }

  /** Attaches the bars to every element under `root` marked `data-lib`, the library's column of a comparison */
  public attachMarked(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-lib]').forEach(element => this.attach(element));
  }

  public destroy(): void {
    this.refs.splice(0).forEach(ref => {
      ref.destroy();
      live.delete(ref);
    });
  }

  public update(): void {
    this.refs.forEach(ref => ref.update());
  }
}
