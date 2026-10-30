import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { type OverlayScrollbarOptions } from '@emmettito/overlay-scrollbar';
import { OverlayScrollbarDirective } from './overlay-scrollbar.directive';

@Component({
  selector: 'test-host',
  imports: [OverlayScrollbarDirective],
  template: `
    <div class="bound" style="overflow-x: auto; overflow-y: auto" [overlayScrollbar]="options()"><p>Content</p></div>
    <div class="bare" style="overflow-x: auto; overflow-y: auto" overlayScrollbar><p>Content</p></div>
  `
})
class TestHostComponent {
  // jsdom has no fine pointer and its scrollbars take no space, like a phone, so the bars are forced on
  public readonly options = signal<OverlayScrollbarOptions>({ force: true });
}

describe('OverlayScrollbarDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  const bound = (): HTMLElement => fixture.nativeElement.querySelector('.bound');
  // The frame the bars are drawn in, right after the element
  const frameOf = (element: HTMLElement): Element | null =>
    element.nextElementSibling?.classList.contains('overlay-scrollbar-frame') ? element.nextElementSibling : null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('draws the bars on its element once rendered', () => {
    expect(frameOf(bound())).not.toBeNull();
    expect(bound().classList).toContain('overlay-scrollbar-host');
  });

  it("keeps the same bars when given options that haven't changed", async () => {
    const drawn = frameOf(bound());
    fixture.componentInstance.options.set({ force: true });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(frameOf(bound())).toBe(drawn);
  });

  it('draws them again with new options', async () => {
    expect(frameOf(bound())?.classList).not.toContain('overlay-scrollbar-always');

    fixture.componentInstance.options.set({ force: true, autoHide: false });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.overlay-scrollbar-frame')).toHaveLength(1);
    expect(frameOf(bound())?.classList).toContain('overlay-scrollbar-always');
  });

  it('works as a bare attribute, with the default options', () => {
    // Touch-only in jsdom, so the defaults draw nothing, as on a phone
    const bare: HTMLElement = fixture.nativeElement.querySelector('.bare');
    expect(frameOf(bare)).toBeNull();
  });

  describe('when the pointer comes onto the element', () => {
    // jsdom has no layout, so the element gets a size, and the bars measure it as the pointer comes onto the element
    async function attachScrollable(options: OverlayScrollbarOptions): Promise<HTMLElement> {
      Object.defineProperties(bound(), {
        clientHeight: { configurable: true, value: 100 },
        scrollHeight: { configurable: true, value: 500 }
      });
      fixture.componentInstance.options.set(options);
      fixture.detectChanges();
      await fixture.whenStable();
      vi.useFakeTimers();
      return frameOf(bound())?.querySelector('.overlay-scrollbar-bar-y') as HTMLElement;
    }
    const pointer = (type: string): boolean => bound().dispatchEvent(new PointerEvent(type, { pointerType: 'mouse' }));

    afterEach(() => {
      vi.useRealTimers();
    });

    it('leaves the bars hidden until scrolling, by default (autoHide true, as on macOS)', async () => {
      const bar = await attachScrollable({ force: true });
      pointer('pointerenter');
      vi.advanceTimersByTime(5000);
      expect(bar.classList).not.toContain('overlay-scrollbar-visible');
    });

    it("lets the options keep them showing until it leaves (autoHide 'leave')", async () => {
      const bar = await attachScrollable({ force: true, autoHide: 'leave' });
      pointer('pointerenter');
      vi.advanceTimersByTime(5000);
      expect(bar.classList).toContain('overlay-scrollbar-visible');

      pointer('pointerleave');
      vi.advanceTimersByTime(500);
      expect(bar.classList).not.toContain('overlay-scrollbar-visible');
    });
  });

  it('removes the bars when destroyed', () => {
    const element = bound();
    fixture.destroy();
    expect(frameOf(element)).toBeNull();
    expect(element.classList).not.toContain('overlay-scrollbar-host');
  });
});
