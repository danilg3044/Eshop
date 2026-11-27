import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { CartActions } from '../../core/cart/cart.actions';
import { selectCartIsEmpty, selectCartLines, selectCartTotal } from '../../core/cart/cart.selectors';

@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <h1>Shopping cart</h1>
    @if (isEmpty()) {
      <p>Your cart is empty.</p>
      <a mat-flat-button routerLink="/">Browse products</a>
    } @else {
      <table class="lines">
        <thead>
          <tr><th scope="col">Product</th><th scope="col">Price</th><th scope="col">Quantity</th><th scope="col">Total</th><th scope="col"><span class="visually-hidden">Remove</span></th></tr>
        </thead>
        <tbody>
          @for (l of lines(); track l.productId) {
            <tr data-testid="cart-line">
              <td><a [routerLink]="['/products', l.productId]">{{ l.name }}</a></td>
              <td>{{ l.price | currency }}</td>
              <td class="qty">
                <button mat-icon-button (click)="setQuantity(l.productId, l.quantity - 1)" [attr.aria-label]="'Decrease ' + l.name">
                  <mat-icon>remove</mat-icon>
                </button>
                <span aria-live="polite">{{ l.quantity }}</span>
                <button mat-icon-button [disabled]="l.quantity >= l.stock" (click)="setQuantity(l.productId, l.quantity + 1)" [attr.aria-label]="'Increase ' + l.name">
                  <mat-icon>add</mat-icon>
                </button>
              </td>
              <td>{{ l.price * l.quantity | currency }}</td>
              <td>
                <button mat-icon-button (click)="remove(l.productId)" [attr.aria-label]="'Remove ' + l.name">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
      <div class="summary">
        <span class="total" data-testid="cart-total">Total: {{ total() | currency }}</span>
        <a mat-flat-button routerLink="/checkout">Checkout</a>
      </div>
    }
  `,
  styles: `
    h1 { font: var(--mat-sys-headline-medium); }
    .lines { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .qty { display: flex; align-items: center; gap: 4px; }
    .summary { display: flex; justify-content: flex-end; align-items: center; gap: 24px; margin-top: 24px; }
    .total { font: var(--mat-sys-title-large); }
  `,
})
export class Cart {
  private readonly store = inject(Store);

  // Read: selectors as signals. Write: dispatch actions; the reducer computes the new state.
  protected readonly lines = this.store.selectSignal(selectCartLines);
  protected readonly total = this.store.selectSignal(selectCartTotal);
  protected readonly isEmpty = this.store.selectSignal(selectCartIsEmpty);

  protected setQuantity(productId: number, quantity: number): void {
    this.store.dispatch(CartActions.setQuantity({ productId, quantity }));
  }

  protected remove(productId: number): void {
    this.store.dispatch(CartActions.removeLine({ productId }));
  }
}
