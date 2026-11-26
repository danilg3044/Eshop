import { CurrencyPipe, DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../core/admin-api';
import { errorMessage } from '../../core/errors';
import { NEXT_STATUSES, Order, OrderScope, OrderStatus, Page } from '../../core/models';
import { StatusChip } from '../shared/status-chip';

/** Current orders (still being processed) and order history (delivered/cancelled). */
@Component({
  selector: 'app-admin-orders',
  imports: [CurrencyPipe, DatePipe, RouterLink, MatTabsModule, MatButtonModule, MatMenuModule, MatPaginatorModule, StatusChip],
  template: `
    <h1>Orders</h1>
    <mat-tab-group [selectedIndex]="scope() === 'CURRENT' ? 0 : 1" (selectedIndexChange)="setScope($event === 0 ? 'CURRENT' : 'HISTORY')">
      <mat-tab label="Current orders" />
      <mat-tab label="Order history" />
    </mat-tab-group>

    @if (orders.hasValue()) {
      @let page = orders.value();
      <table class="orders">
        <thead>
          <tr><th scope="col">#</th><th scope="col">Placed</th><th scope="col">Customer</th><th scope="col">Items</th>
              <th scope="col">Total</th><th scope="col">Status</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr>
        </thead>
        <tbody>
          @for (o of page.content; track o.id) {
            <tr data-testid="admin-order">
              <td>{{ o.id }}</td>
              <td>{{ o.createdAt | date: 'short' }}</td>
              <td><a [routerLink]="['../users', o.userId]">{{ o.userEmail }}</a></td>
              <td>
                @for (i of o.items; track i.productId) {
                  <div>{{ i.quantity }} × {{ i.productName }}</div>
                }
              </td>
              <td>{{ o.total | currency }}</td>
              <td><app-status-chip [status]="o.status" /></td>
              <td>
                @if (next(o.status).length) {
                  <button mat-stroked-button [matMenuTriggerFor]="menu" [attr.aria-label]="'Change status of order ' + o.id">Change status</button>
                  <mat-menu #menu="matMenu">
                    @for (s of next(o.status); track s) {
                      <button mat-menu-item (click)="changeStatus(o, s)">Mark as {{ s.toLowerCase() }}</button>
                    }
                  </mat-menu>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7">No orders here.</td></tr>
          }
        </tbody>
      </table>
      <mat-paginator [length]="page.totalElements" [pageIndex]="page.page" [pageSize]="page.size"
                     [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" aria-label="Order pages" />
    } @else if (orders.error()) {
      <p role="alert">Could not load orders.</p>
    }
  `,
  styles: `
    h1 { font: var(--mat-sys-headline-medium); margin-top: 0; }
    .orders { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); vertical-align: top; }
  `,
})
export class AdminOrders {
  private readonly api = inject(AdminApi);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly scope = signal<OrderScope>('CURRENT');
  private readonly paging = signal({ page: 0, size: 20 });

  protected readonly orders = httpResource<Page<Order>>(() => ({
    url: '/api/admin/orders',
    params: { scope: this.scope(), ...this.paging() },
  }));

  protected next(status: OrderStatus): OrderStatus[] {
    return NEXT_STATUSES[status];
  }

  protected setScope(scope: OrderScope): void {
    this.scope.set(scope);
    this.paging.update((p) => ({ ...p, page: 0 }));
  }

  protected onPage(e: PageEvent): void {
    this.paging.set({ page: e.pageIndex, size: e.pageSize });
  }

  protected changeStatus(order: Order, status: OrderStatus): void {
    this.api.changeOrderStatus(order.id, status).subscribe({
      next: () => {
        this.snackBar.open(`Order #${order.id} is now ${status.toLowerCase()}`, 'OK', { duration: 2500 });
        this.orders.reload();
      },
      error: (err: unknown) => this.snackBar.open(errorMessage(err), 'Dismiss', { duration: 5000 }),
    });
  }
}
