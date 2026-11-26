import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { Page, Product } from '../../core/models';

/** The full product repository, including inactive and out-of-stock items. Read-only. */
@Component({
  selector: 'app-admin-products',
  imports: [CurrencyPipe, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <h1>Products</h1>
    <mat-form-field class="search" subscriptSizing="dynamic">
      <mat-label>Search by name, description or SKU</mat-label>
      <input matInput #box (keyup.enter)="search(box.value)" />
      <button matSuffix mat-icon-button aria-label="Search" (click)="search(box.value)"><mat-icon>search</mat-icon></button>
    </mat-form-field>

    @if (products.hasValue()) {
      @let page = products.value();
      <table mat-table [dataSource]="page.content" class="mat-elevation-z1">
        <ng-container matColumnDef="sku">
          <th mat-header-cell *matHeaderCellDef>SKU</th>
          <td mat-cell *matCellDef="let p">{{ p.sku }}</td>
        </ng-container>
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let p">{{ p.name }}</td>
        </ng-container>
        <ng-container matColumnDef="category">
          <th mat-header-cell *matHeaderCellDef>Category</th>
          <td mat-cell *matCellDef="let p">{{ p.category }}</td>
        </ng-container>
        <ng-container matColumnDef="price">
          <th mat-header-cell *matHeaderCellDef>Price</th>
          <td mat-cell *matCellDef="let p">{{ p.price | currency }}</td>
        </ng-container>
        <ng-container matColumnDef="stock">
          <th mat-header-cell *matHeaderCellDef>Stock</th>
          <td mat-cell *matCellDef="let p" [class.low]="p.stock < 10">{{ p.stock }}</td>
        </ng-container>
        <ng-container matColumnDef="active">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let p">{{ p.active ? 'Active' : 'Inactive' }}</td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns" [class.inactive]="!row.active"></tr>
      </table>
      <mat-paginator [length]="page.totalElements" [pageIndex]="page.page" [pageSize]="page.size"
                     [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" aria-label="Product pages" />
    }
  `,
  styles: `
    h1 { font: var(--mat-sys-headline-medium); margin-top: 0; }
    .search { width: 100%; max-width: 480px; margin-bottom: 16px; }
    table { width: 100%; }
    .low { color: var(--mat-sys-error); font-weight: 600; }
    .inactive { opacity: 0.6; }
  `,
})
export class AdminProducts {
  protected readonly columns: (keyof Product)[] = ['sku', 'name', 'category', 'price', 'stock', 'active'];
  private readonly query = signal('');
  private readonly paging = signal({ page: 0, size: 20 });

  protected readonly products = httpResource<Page<Product>>(() => ({
    url: '/api/admin/products',
    params: { q: this.query(), ...this.paging() },
  }));

  protected search(text: string): void {
    this.query.set(text.trim());
    this.paging.update((p) => ({ ...p, page: 0 }));
  }

  protected onPage(e: PageEvent): void {
    this.paging.set({ page: e.pageIndex, size: e.pageSize });
  }
}
