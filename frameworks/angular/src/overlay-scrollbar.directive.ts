import { afterRenderEffect, computed, Directive, ElementRef, inject, input } from '@angular/core';
import { attachOverlayScrollbar, type OverlayScrollbarOptions } from '@emmettito/overlay-scrollbar';

/** Overlay scrollbars on any scrollable element: `<div overlayScrollbar>` or `<div [overlayScrollbar]="options">`. */
@Directive({ selector: '[overlayScrollbar]' })
export class OverlayScrollbarDirective {
  // Compared by value, so options rebuilt with the same values don't re-attach the bars
  private readonly attachOptions = computed(() => this.options(), {
    equal: (a, b) => JSON.stringify(a) === JSON.stringify(b)
  });
  public readonly options = input(
    {},
    {
      alias: 'overlayScrollbar',
      // The bare attribute gives an empty string
      transform: (options: OverlayScrollbarOptions | '') => options || {}
    }
  );

  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    // Attaches once rendered (in the browser only), and again whenever the options change; the cleanup removes the
    // previous bars
    afterRenderEffect(onCleanup => {
      const scrollbar = attachOverlayScrollbar(element, this.attachOptions());
      onCleanup(() => scrollbar.destroy());
    });
  }
}
