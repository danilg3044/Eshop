import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/cart.service';

@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <h1>Shopping cart</h1>
    @if (cart.isEmpty()) {
      <p>Your cart is empty.</p>
      <a mat-flat-button routerLink="/">Browse products</a>
    } @else {
      <table class="lines">
        <thead>
          <tr><th scope="col">Product</th><th scope="col">Price</th><th scope="col">Quantity</th><th scope="col">Total</th><th scope="col"><span class="visually-hidden">Remove</span></th></tr>
        </thead>
        <tbody>
          @for (l of cart.lines(); track l.productId) {
            <tr data-testid="cart-line">
              <td><a [routerLink]="['/products', l.productId]">{{ l.name }}</a></td>
              <td>{{ l.price | currency }}</td>
              <td class="qty">
                <button mat-icon-button (click)="cart.setQuantity(l.productId, l.quantity - 1)" [attr.aria-label]="'Decrease ' + l.name">
                  <mat-icon>remove</mat-icon>
                </button>
                <span aria-live="polite">{{ l.quantity }}</span>
                <button mat-icon-button [disabled]="l.quantity >= l.stock" (click)="cart.setQuantity(l.productId, l.quantity + 1)" [attr.aria-label]="'Increase ' + l.name">
                  <mat-icon>add</mat-icon>
                </button>
              </td>
              <td>{{ l.price * l.quantity | currency }}</td>
              <td>
                <button mat-icon-button (click)="cart.remove(l.productId)" [attr.aria-label]="'Remove ' + l.name">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
      <div class="summary">
        <span class="total" data-testid="cart-total">Total: {{ cart.total() | currency }}</span>
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
  protected readonly cart = inject(CartService);
}
