import { type OverlayScrollbarOptions } from '@emmettito/overlay-scrollbar';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App, createApp, h, nextTick, ref, withDirectives } from 'vue';
import { vOverlayScrollbar } from './vOverlayScrollbar';

describe('vOverlayScrollbar', () => {
  let container: HTMLElement;
  let app: App;
  // jsdom has no fine pointer and its scrollbars take no space, like a phone, so the bars are forced on
  const options = ref<OverlayScrollbarOptions>({ force: true });
  // Re-renders the element without changing the options
  const label = ref('');
  const list = (): HTMLElement => container.querySelector('.list') as HTMLElement;
  // The frame the bars are drawn in, right after the element
  const frame = (): Element | null => list()?.nextElementSibling ?? null;

  beforeEach(() => {
    options.value = { force: true };
    container = document.body.appendChild(document.createElement('div'));
    app = createApp({
      render: () =>
        withDirectives(h('div', { class: 'list', style: { overflowX: 'auto', overflowY: 'auto' } }, label.value), [
          [vOverlayScrollbar, options.value]
        ])
    });
    app.mount(container);
  });

  afterEach(() => {
    app.unmount();
    container.remove();
  });

  it('draws the bars on the element once mounted', () => {
    expect(frame()?.classList).toContain('overlay-scrollbar-frame');
  });

  it("keeps the same bars when the component updates but the options don't change", async () => {
    const drawn = frame();
    label.value = 'updated';
    options.value = { force: true };
    await nextTick();
    expect(list().textContent).toBe('updated');
    expect(frame()).toBe(drawn);
  });

  it('draws them again when the options change', async () => {
    options.value = { force: true, autoHide: false };
    await nextTick();
    expect(container.querySelectorAll('.overlay-scrollbar-frame')).toHaveLength(1);
    expect(frame()?.classList).toContain('overlay-scrollbar-always');
  });

  it('removes the bars when unmounted', () => {
    const element = list();
    app.unmount();
    expect(element.classList).not.toContain('overlay-scrollbar-host');
    expect(container.querySelector('.overlay-scrollbar-frame')).toBeNull();
    // Mounted again for afterEach to unmount
    app = createApp({ render: () => null });
    app.mount(container);
  });
});
