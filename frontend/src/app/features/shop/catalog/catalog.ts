import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { CartActions } from '../../../core/cart/cart.actions';
import { Page, Product } from '../../../core/models';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-catalog',
  imports: [
    CurrencyPipe, NgOptimizedImage, RouterLink,
    MatCardModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatPaginatorModule,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class Catalog {
  private readonly store = inject(Store);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly query = signal('');
  protected readonly category = signal('');
  private readonly pageIndex = signal(0);

  /** Re-fetches automatically whenever query, category or page changes. */
  protected readonly products = httpResource<Page<Product>>(() => ({
    url: '/api/products',
    params: { q: this.query(), category: this.category(), page: this.pageIndex(), size: PAGE_SIZE },
  }));
  protected readonly categories = httpResource<string[]>(() => '/api/products/categories');

  protected search(text: string): void {
    this.query.set(text.trim());
    this.pageIndex.set(0);
  }

  protected setCategory(category: string): void {
    this.category.set(category);
    this.pageIndex.set(0);
  }

  protected onPage(e: PageEvent): void {
    this.pageIndex.set(e.pageIndex);
  }

  protected addToCart(p: Product): void {
    this.store.dispatch(CartActions.addProduct({ product: p, quantity: 1 }));
    this.snackBar.open(`${p.name} added to cart`, 'OK', { duration: 2000 });
  }
}
