import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Order, Profile, ShippingAddress, User } from './models';

/** Customer-side write calls. (Reads that drive a page use httpResource directly in the component.) */
@Service()
export class ShopApi {
  private readonly http = inject(HttpClient);

  placeOrder(items: { productId: number; quantity: number }[], shipping: ShippingAddress): Observable<Order> {
    return this.http.post<Order>('/api/orders', { items, shipping });
  }

  updateProfile(profile: Profile): Observable<User> {
    return this.http.put<User>('/api/profile', profile);
  }
}
