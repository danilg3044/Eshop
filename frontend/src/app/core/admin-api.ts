import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Order, OrderStatus } from './models';

/** Admin write calls. (List/detail pages read with httpResource.) */
@Service()
export class AdminApi {
  private readonly http = inject(HttpClient);

  changeOrderStatus(orderId: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`/api/admin/orders/${orderId}/status`, { status });
  }
}
