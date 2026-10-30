import { watchDirection } from './watch-direction.js';

// MutationObserver callbacks run in a microtask
const settle = (): Promise<void> => new Promise(resolve => setTimeout(resolve));

describe('watchDirection', () => {
  let element: HTMLElement;
  const unwatchers: (() => void)[] = [];

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    unwatchers.splice(0).forEach(unwatch => unwatch());
    element.remove();
    vi.restoreAllMocks();
  });

  it('calls every listener when a dir attribute changes anywhere in the document', async () => {
    const first = vi.fn();
    const second = vi.fn();
    unwatchers.push(watchDirection(first), watchDirection(second));

    element.dir = 'rtl';
    await settle();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('ignores other attributes', async () => {
    const listener = vi.fn();
    unwatchers.push(watchDirection(listener));
    element.lang = 'ar';
    element.className = 'x';
    await settle();
    expect(listener).not.toHaveBeenCalled();
  });

  it('shares one observer, disconnected once the last listener stops', async () => {
    const observe = vi.spyOn(MutationObserver.prototype, 'observe');
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const first = vi.fn();
    const second = vi.fn();
    const unwatchFirst = watchDirection(first);
    const unwatchSecond = watchDirection(second);
    expect(observe).toHaveBeenCalledTimes(1);

    unwatchFirst();
    expect(disconnect).not.toHaveBeenCalled();
    element.dir = 'rtl';
    await settle();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    unwatchSecond();
    expect(disconnect).toHaveBeenCalledTimes(1);
    element.dir = 'ltr';
    await settle();
    expect(second).toHaveBeenCalledTimes(1);

    // A new listener starts a new observer
    unwatchers.push(watchDirection(first));
    expect(observe).toHaveBeenCalledTimes(2);
  });
});
