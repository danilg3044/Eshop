import { CurrencyPipe, DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../../core/admin-api';
import { errorMessage } from '../../../core/errors';
import { NEXT_STATUSES, Order, OrderScope, OrderStatus, Page } from '../../../core/models';
import { StatusChip } from '../../shared/status-chip/status-chip';

/** Current orders (still being processed) and order history (delivered/cancelled). */
@Component({
  selector: 'app-admin-orders',
  imports: [CurrencyPipe, DatePipe, RouterLink, MatTabsModule, MatButtonModule, MatMenuModule, MatPaginatorModule, StatusChip],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.scss',
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
