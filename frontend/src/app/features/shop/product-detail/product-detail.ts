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
import { CartActions } from '../../../core/cart/cart.actions';
import { Product } from '../../../core/models';

@Component({
  selector: 'app-product-detail',
  imports: [CurrencyPipe, NgOptimizedImage, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
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
