import { Component, input } from '@angular/core';
import { OrderStatus } from '../../../core/models';

@Component({
  selector: 'app-status-chip',
  templateUrl: './status-chip.html',
  styleUrl: './status-chip.scss',
})
export class StatusChip {
  readonly status = input.required<OrderStatus>();
}
