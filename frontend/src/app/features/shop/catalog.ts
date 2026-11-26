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
import { CartService } from '../../core/cart.service';
import { Page, Product } from '../../core/models';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-catalog',
  imports: [
    CurrencyPipe, NgOptimizedImage, RouterLink,
    MatCardModule, MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatPaginatorModule,
  ],
  template: `
    <h1 class="visually-hidden">Product catalog</h1>
    <div class="filters">
      <mat-form-field class="search" subscriptSizing="dynamic">
        <mat-label>Search products</mat-label>
        <input matInput #box [value]="query()" (keyup.enter)="search(box.value)" data-testid="search" />
        <button matSuffix mat-icon-button aria-label="Search" (click)="search(box.value)"><mat-icon>search</mat-icon></button>
      </mat-form-field>

      <mat-button-toggle-group [value]="category()" (change)="setCategory($event.value)" aria-label="Category">
        <mat-button-toggle value="">All</mat-button-toggle>
        @for (c of categories.value() ?? []; track c) {
          <mat-button-toggle [value]="c">{{ c }}</mat-button-toggle>
        }
      </mat-button-toggle-group>
    </div>

    @if (products.error()) {
      <p role="alert" class="error">Could not load products. Is the backend running?</p>
    } @else if (products.hasValue()) {
      @let page = products.value();
      @if (page.content.length === 0) {
        <p>No products match your search.</p>
      }
      <div class="grid">
        @for (p of page.content; track p.id; let i = $index) {
          <mat-card class="product" data-testid="product-card">
            @if (p.imageUrl) {
              <img mat-card-image [ngSrc]="p.imageUrl" width="400" height="300" [priority]="i < 4" alt="" />
            }
            <mat-card-header>
              <mat-card-title><a [routerLink]="['/products', p.id]">{{ p.name }}</a></mat-card-title>
              <mat-card-subtitle>{{ p.category }}</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p class="price">{{ p.price | currency }}</p>
              <p class="stock">{{ p.stock > 0 ? p.stock + ' in stock' : 'Out of stock' }}</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-flat-button [disabled]="p.stock === 0" (click)="addToCart(p)">Add to cart</button>
            </mat-card-actions>
          </mat-card>
        }
      </div>
      <mat-paginator
        [length]="page.totalElements"
        [pageIndex]="page.page"
        [pageSize]="pageSize"
        [hidePageSize]="true"
        (page)="onPage($event)"
        aria-label="Product pages" />
    }
  `,
  styles: `
    .filters { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 16px; }
    .search { flex: 1; min-width: 240px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .product { display: flex; flex-direction: column; }
    .product mat-card-content { flex: 1; }
    .product img { height: auto; }
    mat-card-title a { color: inherit; text-decoration: none; }
    mat-card-title a:hover { text-decoration: underline; }
    .price { font: var(--mat-sys-title-medium); margin: 8px 0 0; }
    .stock { color: var(--mat-sys-on-surface-variant); margin: 0; }
    .error { color: var(--mat-sys-error); }
  `,
})
export class Catalog {
  private readonly cart = inject(CartService);
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
    this.cart.add(p);
    this.snackBar.open(`${p.name} added to cart`, 'OK', { duration: 2000 });
  }
}
