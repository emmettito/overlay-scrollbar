import { Component, computed, signal } from '@angular/core';
import { OverlayScrollbarDirective } from './overlay-scrollbar.directive';

@Component({
  selector: 'angular-demo',
  imports: [OverlayScrollbarDirective],
  template: `
    <div class="demo">
      <div class="controls">
        <button type="button" (click)="add()">Add 10 items</button>
        <button type="button" (click)="remove()">Remove 10 items</button>
        <label>
          <input type="checkbox" [checked]="keepShowing()" (change)="keepShowing.set(!keepShowing())" />
          Keep the bars showing
        </label>
        <span class="count">{{ count() }} items</span>
      </div>
      <div class="list" [overlayScrollbar]="options()">
        <div class="row">This first row is wide enough to scroll sideways as well, so both bars show</div>
        @for (item of items(); track item) {
          <div class="row">Item {{ item }}</div>
        }
      </div>
    </div>
  `
})
export class AngularDemo {
  protected readonly count = signal(30);
  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, i) => i + 1));
  protected readonly keepShowing = signal(false);
  protected readonly options = computed(() => ({ autoHide: !this.keepShowing() }));

  protected add(): void {
    this.count.update(count => count + 10);
  }

  protected remove(): void {
    this.count.update(count => Math.max(0, count - 10));
  }
}
