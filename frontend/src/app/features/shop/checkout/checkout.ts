import { CurrencyPipe } from '@angular/common';
import { Component, inject, linkedSignal, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectProfile } from '../../../core/auth/auth.selectors';
import { CartActions } from '../../../core/cart/cart.actions';
import { selectCartIsEmpty, selectCartLines, selectCartTotal, selectOrderItems } from '../../../core/cart/cart.selectors';
import { errorMessage } from '../../../core/errors';
import { Profile, ShippingAddress } from '../../../core/models';
import { ShopApi } from '../../../core/shop-api';
import { FieldError } from '../../shared/field-error/field-error';

/** Shipping address (pre-filled from the profile) + order summary → places the order. */
@Component({
  selector: 'app-checkout',
  imports: [CurrencyPipe, RouterLink, FormField, FormRoot, FieldError, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly store = inject(Store);
  protected readonly lines = this.store.selectSignal(selectCartLines);
  protected readonly total = this.store.selectSignal(selectCartTotal);
  protected readonly isEmpty = this.store.selectSignal(selectCartIsEmpty);
  private readonly orderItems = this.store.selectSignal(selectOrderItems);
  private readonly api = inject(ShopApi);
  private readonly router = inject(Router);

  protected readonly error = signal<string | null>(null);
  /** Pre-filled from the profile in the store, then edited freely. */
  private readonly profile = this.store.selectSignal(selectProfile);
  private readonly model = linkedSignal<ShippingAddress>(() => shippingFrom(this.profile()));

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
            const order = await firstValueFrom(this.api.placeOrder(this.orderItems(), this.model()));
            this.store.dispatch(CartActions.clear());
            await this.router.navigate(['/orders'], { queryParams: { placed: order.id } });
          } catch (err) {
            this.error.set(errorMessage(err, 'Could not place the order'));
          }
          return undefined;
        },
      },
    },
  );
}

function shippingFrom(p: Profile | null): ShippingAddress {
  return {
    name: [p?.firstName, p?.lastName].filter(Boolean).join(' '),
    addressLine: p?.addressLine ?? '',
    city: p?.city ?? '',
    postalCode: p?.postalCode ?? '',
    country: p?.country ?? '',
  };
}
