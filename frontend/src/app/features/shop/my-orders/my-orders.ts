import { CurrencyPipe, DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { Order } from '../../../core/models';
import { StatusChip } from '../../shared/status-chip/status-chip';

@Component({
  selector: 'app-my-orders',
  imports: [CurrencyPipe, DatePipe, MatExpansionModule, StatusChip],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.scss',
})
export class MyOrders {
  /** "?placed=<id>" after checkout. */
  readonly placed = input<string>();
  protected readonly orders = httpResource<Order[]>(() => '/api/orders/mine');
}
