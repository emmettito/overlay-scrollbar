import { type OverlayScrollbarOptions } from '@emmettito/overlay-scrollbar';
import { act, createElement, ReactElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useOverlayScrollbar } from './useOverlayScrollbar';

// Tells React it's running in tests, so act() flushes effects
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function List({ options, shown = true }: { options: OverlayScrollbarOptions; shown?: boolean }): ReactElement {
  const ref = useOverlayScrollbar<HTMLDivElement>(options);
  return createElement(
    'section',
    null,
    shown && createElement('div', { className: 'list', ref, style: { overflowX: 'auto', overflowY: 'auto' } })
  );
}

describe('useOverlayScrollbar', () => {
  let container: HTMLElement;
  let root: Root;
  const list = (): HTMLElement => container.querySelector('.list') as HTMLElement;
  // The frame the bars are drawn in, right after the element
  const frame = (): Element | null => list()?.nextElementSibling ?? null;
  // jsdom has no fine pointer and its scrollbars take no space, like a phone, so the bars are forced on
  const render = (options: OverlayScrollbarOptions, shown = true): Promise<void> =>
    act(async () => root.render(createElement(List, { options, shown })));

  beforeEach(() => {
    container = document.body.appendChild(document.createElement('div'));
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('draws the bars on the element once mounted', async () => {
    await render({ force: true });
    expect(frame()?.classList).toContain('overlay-scrollbar-frame');
  });

  it("keeps the same bars when re-rendered with options that haven't changed", async () => {
    await render({ force: true });
    const drawn = frame();
    await render({ force: true });
    expect(frame()).toBe(drawn);
  });

  it('keeps the same bars when re-rendered with the same options in another order', async () => {
    await render({ force: true, autoHide: false });
    const drawn = frame();
    await render({ autoHide: false, force: true });
    expect(frame()).toBe(drawn);
  });

  it('draws them again when the options change', async () => {
    await render({ force: true });
    await render({ force: true, autoHide: false });
    expect(container.querySelectorAll('.overlay-scrollbar-frame')).toHaveLength(1);
    expect(frame()?.classList).toContain('overlay-scrollbar-always');
  });

  it('draws the bars on an element rendered later, e.g. under a condition', async () => {
    await render({ force: true }, false);
    expect(container.querySelector('.overlay-scrollbar-frame')).toBeNull();
    await render({ force: true }, true);
    expect(frame()?.classList).toContain('overlay-scrollbar-frame');
  });

  it('removes the bars when unmounted', async () => {
    await render({ force: true });
    const element = list();
    await act(() => root.render(null));
    expect(element.classList).not.toContain('overlay-scrollbar-host');
    expect(container.querySelector('.overlay-scrollbar-frame')).toBeNull();
  });
});
