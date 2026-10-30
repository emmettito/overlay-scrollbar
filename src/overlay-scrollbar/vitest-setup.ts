// Stand-ins for what jsdom lacks, which the library's specs need: Vitest's setupFiles, in jsdom. Here, so a copy of the
// library brings them with its specs; this repo's app and framework wrapper specs use them too.

// Keeps every instance in ResizeObserver.instances, a plain array that vi.restoreAllMocks() can't wipe (the library
// creates its shared observer once per spec file), so specs can find one and report a resize with resize()
class ResizeObserverStandIn {
  public readonly disconnect = vi.fn();
  public static readonly instances: ResizeObserverStandIn[] = [];
  public readonly observe = vi.fn();
  public readonly unobserve = vi.fn();

  constructor(private readonly callback: ResizeObserverCallback) {
    ResizeObserverStandIn.instances.push(this);
  }

  public resize(entries: Partial<ResizeObserverEntry>[]): void {
    this.callback(entries as ResizeObserverEntry[], this as unknown as ResizeObserver);
  }
}
window.ResizeObserver = ResizeObserverStandIn as unknown as typeof ResizeObserver;

// No CSS.supports, so the thumbs follow the scroll listener rather than scroll-driven animations
Object.defineProperty(window, 'CSS', { configurable: true, writable: true, value: { escape: (str: string) => str } });

// No Element.scrollTo: sets the scroll position at once, as a browser does with behavior 'instant'
Element.prototype.scrollTo = function (this: Element, options?: ScrollToOptions | number, y?: number): void {
  const { left, top } = typeof options === 'number' ? { left: options, top: y } : (options ?? {});
  if (left !== undefined) {
    this.scrollLeft = left;
  }
  if (top !== undefined) {
    this.scrollTop = top;
  }
} as Element['scrollTo'];

// No fine pointer, like a phone. A plain function, so vi.resetAllMocks() in a spec can't wipe it.
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
});
