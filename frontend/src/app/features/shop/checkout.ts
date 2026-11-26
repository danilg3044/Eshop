import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { errorMessage } from '../../core/errors';
import { ShippingAddress } from '../../core/models';
import { ShopApi } from '../../core/shop-api';
import { FieldError } from '../shared/field-error';

/** Shipping address (pre-filled from the profile) + order summary → places the order. */
@Component({
  selector: 'app-checkout',
  imports: [CurrencyPipe, RouterLink, FormField, FormRoot, FieldError, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h1>Checkout</h1>
    @if (cart.isEmpty()) {
      <p>Your cart is empty. <a routerLink="/">Continue shopping</a></p>
    } @else {
      <div class="layout">
        <mat-card>
          <mat-card-header><mat-card-title><h2>Shipping address</h2></mat-card-title></mat-card-header>
          <mat-card-content>
            <form [formRoot]="shippingForm" id="checkout-form">
              <mat-form-field>
                <mat-label>Full name</mat-label>
                <input matInput autocomplete="name" [formField]="shippingForm.name" />
              </mat-form-field>
              <app-field-error [field]="shippingForm.name" />
              <mat-form-field>
                <mat-label>Address</mat-label>
                <input matInput autocomplete="street-address" [formField]="shippingForm.addressLine" />
              </mat-form-field>
              <app-field-error [field]="shippingForm.addressLine" />
              <mat-form-field>
                <mat-label>City</mat-label>
                <input matInput autocomplete="address-level2" [formField]="shippingForm.city" />
              </mat-form-field>
              <app-field-error [field]="shippingForm.city" />
              <mat-form-field>
                <mat-label>Postal code</mat-label>
                <input matInput autocomplete="postal-code" [formField]="shippingForm.postalCode" />
              </mat-form-field>
              <app-field-error [field]="shippingForm.postalCode" />
              <mat-form-field>
                <mat-label>Country</mat-label>
                <input matInput autocomplete="country-name" [formField]="shippingForm.country" />
              </mat-form-field>
              <app-field-error [field]="shippingForm.country" />
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title><h2>Order summary</h2></mat-card-title></mat-card-header>
          <mat-card-content>
            <ul class="summary">
              @for (l of cart.lines(); track l.productId) {
                <li><span>{{ l.quantity }} × {{ l.name }}</span><span>{{ l.price * l.quantity | currency }}</span></li>
              }
            </ul>
            <p class="total">Total: {{ cart.total() | currency }}</p>
            <p class="note">Payment is simulated: the order is created as PENDING and handled by the store.</p>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
          </mat-card-content>
          <mat-card-actions>
            <button mat-flat-button type="submit" form="checkout-form" [disabled]="shippingForm().submitting()">
              Place order
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
  styles: `
    h1 { font: var(--mat-sys-headline-medium); }
    h2 { font: var(--mat-sys-title-large); margin: 0; }
    .layout { display: grid; grid-template-columns: 3fr 2fr; gap: 24px; align-items: start; }
    form { display: flex; flex-direction: column; margin-top: 16px; }
    .summary { list-style: none; padding: 0; }
    .summary li { display: flex; justify-content: space-between; padding: 4px 0; }
    .total { font: var(--mat-sys-title-medium); text-align: right; }
    .note { color: var(--mat-sys-on-surface-variant); font: var(--mat-sys-body-small); }
    .error { color: var(--mat-sys-error); }
    @media (max-width: 800px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class Checkout {
  protected readonly cart = inject(CartService);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ShopApi);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);
  private readonly model = signal<ShippingAddress>({ name: '', addressLine: '', city: '', postalCode: '', country: '' });

  protected readonly shippingForm = form(
    this.model,
    (s) => {
      required(s.name, { message: 'Name is required' });
      maxLength(s.name, 200);
      required(s.addressLine, { message: 'Address is required' });
      required(s.city, { message: 'City is required' });
      required(s.postalCode, { message: 'Postal code is required' });
      maxLength(s.postalCode, 20, { message: 'At most 20 characters' });
      required(s.country, { message: 'Country is required' });
    },
    {
      submission: {
        action: async () => {
          this.error.set(null);
          try {
            const items = this.cart.lines().map((l) => ({ productId: l.productId, quantity: l.quantity }));
            const order = await firstValueFrom(this.api.placeOrder(items, this.model()));
            this.cart.clear();
            await this.router.navigate(['/orders'], { queryParams: { placed: order.id } });
          } catch (err) {
            this.error.set(errorMessage(err, 'Could not place the order'));
          }
          return undefined;
        },
      },
    },
  );

  constructor() {
    // Pre-fill the address from the user's profile.
    this.auth.loadCurrentUser().subscribe((u) => {
      const p = u.profile;
      this.model.set({
        name: [p.firstName, p.lastName].filter(Boolean).join(' '),
        addressLine: p.addressLine ?? '',
        city: p.city ?? '',
        postalCode: p.postalCode ?? '',
        country: p.country ?? '',
      });
    });
  }
}
