import { type OverlayScrollbarOptions } from '@emmettito/overlay-scrollbar';
import type { ActionReturn } from 'svelte/action';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { overlayScrollbar } from './overlayScrollbar';

// The action is a plain function, so it's called as Svelte would: on the element, then update() and destroy()
describe('overlayScrollbar', () => {
  let element: HTMLElement;
  let action: ActionReturn<OverlayScrollbarOptions | undefined>;
  // The frame the bars are drawn in, right after the element
  const frame = (): Element | null => element.nextElementSibling;

  beforeEach(() => {
    element = document.body.appendChild(document.createElement('div'));
    element.style.overflowX = 'auto';
    element.style.overflowY = 'auto';
    // jsdom has no fine pointer and its scrollbars take no space, like a phone, so the bars are forced on
    action = overlayScrollbar(element, { force: true }) as ActionReturn<OverlayScrollbarOptions | undefined>;
  });

  afterEach(() => {
    action.destroy?.();
    element.remove();
  });

  it('draws the bars on its element', () => {
    expect(frame()?.classList).toContain('overlay-scrollbar-frame');
  });

  it("keeps the same bars when updated with options that haven't changed", () => {
    const drawn = frame();
    action.update?.({ force: true });
    expect(frame()).toBe(drawn);
  });

  it('draws them again with new options', () => {
    action.update?.({ force: true, autoHide: false });
    expect(document.querySelectorAll('.overlay-scrollbar-frame')).toHaveLength(1);
    expect(frame()?.classList).toContain('overlay-scrollbar-always');
  });

  it('removes the bars when destroyed', () => {
    action.destroy?.();
    expect(element.classList).not.toContain('overlay-scrollbar-host');
    expect(frame()).toBeNull();
  });
});
