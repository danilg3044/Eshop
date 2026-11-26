import { CurrencyPipe, DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, input } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { Order } from '../../core/models';
import { StatusChip } from '../shared/status-chip';

@Component({
  selector: 'app-my-orders',
  imports: [CurrencyPipe, DatePipe, MatExpansionModule, StatusChip],
  template: `
    <h1>My orders</h1>
    @if (placed()) {
      <p class="ok" role="status">Thank you! Order #{{ placed() }} has been placed.</p>
    }
    @if (orders.hasValue()) {
      @if (orders.value().length === 0) {
        <p>You have not placed any orders yet.</p>
      }
      <mat-accordion>
        @for (o of orders.value(); track o.id) {
          <mat-expansion-panel data-testid="order">
            <mat-expansion-panel-header>
              <mat-panel-title>Order #{{ o.id }}</mat-panel-title>
              <mat-panel-description>
                {{ o.createdAt | date: 'medium' }} · {{ o.total | currency }}
                <app-status-chip [status]="o.status" />
              </mat-panel-description>
            </mat-expansion-panel-header>
            <ul>
              @for (i of o.items; track i.productId) {
                <li>{{ i.quantity }} × {{ i.productName }} @ {{ i.unitPrice | currency }}</li>
              }
            </ul>
            <p>Ship to: {{ o.shipping.name }}, {{ o.shipping.addressLine }}, {{ o.shipping.city }} {{ o.shipping.postalCode }}, {{ o.shipping.country }}</p>
          </mat-expansion-panel>
        }
      </mat-accordion>
    } @else if (orders.error()) {
      <p role="alert">Could not load your orders.</p>
    }
  `,
  styles: `
    h1 { font: var(--mat-sys-headline-medium); }
    mat-panel-description { justify-content: flex-end; gap: 16px; align-items: center; }
    .ok { padding: 12px 16px; border-radius: 8px; background: #d1e7dd; color: #0a3622; }
  `,
})
export class MyOrders {
  /** "?placed=<id>" after checkout. */
  readonly placed = input<string>();
  protected readonly orders = httpResource<Order[]>(() => '/api/orders/mine');
}
