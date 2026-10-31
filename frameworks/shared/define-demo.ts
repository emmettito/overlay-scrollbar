// The demo's element, <angular-demo>, <react-demo> and so on, which the app puts on the framework's page
// (src/demos/framework-page.ts): the framework's app is mounted in it when it's added to the page, and unmounted when
// it's taken off.

/** Mounts the demo in `host`, and returns what unmounts it: or a promise of that, for Angular, which starts up async */
type Mount = (host: HTMLElement) => (() => void) | Promise<() => void>;

export function defineDemo(name: string, mount: Mount): void {
  customElements.define(
    name,
    class extends HTMLElement {
      private unmount: (() => void) | Promise<(() => void) | undefined> | undefined;

      public connectedCallback(): void {
        const mounted = mount(this);
        // A demo that fails to start is logged, rather than left an unhandled rejection, and has nothing to unmount
        this.unmount =
          typeof mounted === 'function'
            ? mounted
            : mounted.catch((error: unknown) => {
                console.error(error);
                return undefined;
              });
      }

      public disconnectedCallback(): void {
        const unmount = this.unmount;
        this.unmount = undefined;
        if (typeof unmount === 'function') {
          unmount();
        } else {
          // Taken off before it had mounted: unmounted once it has
          void unmount?.then(done => done?.());
        }
      }
    }
  );
}
