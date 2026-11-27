import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DescriptionRequest, DescriptionSuggestion, Order, OrderStatus, Product } from './models';

/** Admin write calls. (List/detail pages read with httpResource.) */
@Service()
export class AdminApi {
  private readonly http = inject(HttpClient);

  changeOrderStatus(orderId: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`/api/admin/orders/${orderId}/status`, { status });
  }

  /** cloud/ai-service writes a suggestion; nothing is saved yet. */
  suggestDescription(request: DescriptionRequest): Observable<DescriptionSuggestion> {
    return this.http.post<DescriptionSuggestion>('/api/ai/product-descriptions', request);
  }

  changeDescription(productId: number, description: string): Observable<Product> {
    return this.http.put<Product>(`/api/admin/products/${productId}/description`, { description });
  }
}
