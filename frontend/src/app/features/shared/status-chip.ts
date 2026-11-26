import { Component, input } from '@angular/core';
import { OrderStatus } from '../../core/models';

@Component({
  selector: 'app-status-chip',
  template: `<span class="chip" [class]="'chip ' + status().toLowerCase()">{{ status() }}</span>`,
  styles: `
    .chip {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font: var(--mat-sys-label-medium);
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
    }
    .pending { background: #fff3cd; color: #664d03; }
    .paid { background: #cfe2ff; color: #052c65; }
    .shipped { background: #e0cffc; color: #3d0a91; }
    .delivered { background: #d1e7dd; color: #0a3622; }
    .cancelled { background: #f8d7da; color: #58151c; }
  `,
})
export class StatusChip {
  readonly status = input.required<OrderStatus>();
}
