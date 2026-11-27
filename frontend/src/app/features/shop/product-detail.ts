import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { CartActions } from '../../core/cart/cart.actions';
import { Product } from '../../core/models';

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, NgOptimizedImage, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <a mat-button routerLink="/"><mat-icon>arrow_back</mat-icon> Back to catalog</a>
    @if (product.error()) {
      <p role="alert">This product is not available.</p>
    } @else if (product.hasValue()) {
      @let p = product.value();
      <article class="detail">
        @if (p.imageUrl) {
          <img [ngSrc]="p.imageUrl" width="400" height="300" priority alt="" />
        }
        <div>
          <h1>{{ p.name }}</h1>
          <p class="meta">{{ p.category }} · SKU {{ p.sku }}</p>
          <p class="price">{{ p.price | currency }}</p>
          <p>{{ p.description }}</p>
          <p>{{ p.stock > 0 ? p.stock + ' in stock' : 'Out of stock' }}</p>
          <div class="buy">
            <mat-form-field class="qty" subscriptSizing="dynamic">
              <mat-label>Quantity</mat-label>
              <input matInput type="number" min="1" [max]="p.stock" [value]="quantity()"
                     (input)="quantity.set(+$any($event.target).value || 1)" />
            </mat-form-field>
            <button mat-flat-button [disabled]="p.stock === 0" (click)="add(p)">Add to cart</button>
          </div>
        </div>
      </article>
    }
  `,
  styles: `
    .detail { display: grid; grid-template-columns: minmax(0, 400px) 1fr; gap: 32px; margin-top: 16px; }
    img { width: 100%; height: auto; border-radius: 12px; }
    h1 { font: var(--mat-sys-headline-medium); margin: 0; }
    .meta { color: var(--mat-sys-on-surface-variant); }
    .price { font: var(--mat-sys-headline-small); }
    .buy { display: flex; gap: 16px; align-items: center; }
    .qty { width: 120px; }
    @media (max-width: 700px) { .detail { grid-template-columns: 1fr; } }
  `,
})
export class ProductDetail {
  private readonly store = inject(Store);
  private readonly snackBar = inject(MatSnackBar);

  /** Route parameter ":id" (bound via withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly quantity = signal(1);
  protected readonly product = httpResource<Product>(() => `/api/products/${this.id()}`);

  protected add(p: Product): void {
    this.store.dispatch(CartActions.addProduct({ product: p, quantity: this.quantity() }));
    this.snackBar.open(`${p.name} added to cart`, 'OK', { duration: 2000 });
  }
}
