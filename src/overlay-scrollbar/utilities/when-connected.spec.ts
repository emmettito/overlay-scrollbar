import { attachOverlayScrollbar } from '../overlay-scrollbar.js';

// Needs Node's --expose-gc (the library's Vitest project here has it); skipped where gc() isn't available
const gc = (globalThis as { gc?: () => void }).gc;
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('whenConnected', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.skipIf(!gc)('stops checking every frame once an element dropped while waiting is garbage collected', async () => {
    const requests = vi.spyOn(window, 'requestAnimationFrame');
    // Attached before it's in the page, then dropped without being destroyed
    (() => attachOverlayScrollbar(document.createElement('div'), { force: true }))();
    await wait(40);
    expect(requests).toHaveBeenCalled();

    // An element a check has just looked at stays alive until that task ends, so it may take more than one
    for (let i = 0; i < 10; i++) {
      gc?.();
      await wait(20);
    }
    requests.mockClear();
    await wait(200);
    expect(requests).not.toHaveBeenCalled();
  });
});
