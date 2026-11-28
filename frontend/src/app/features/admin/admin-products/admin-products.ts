import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Page, Product } from '../../../core/models';
import { DescriptionWriter } from '../description-writer/description-writer';

/** The full product repository, including inactive and out-of-stock items. Descriptions can be (re)written with AI. */
@Component({
  selector: 'app-admin-products',
  imports: [CurrencyPipe, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './admin-products.html',
  styleUrl: './admin-products.scss',
})
export class AdminProducts {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['sku', 'name', 'category', 'price', 'stock', 'active', 'actions'];
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

  protected writeDescription(product: Product): void {
    this.dialog
      .open<DescriptionWriter, Product, Product>(DescriptionWriter, { data: product, width: '640px', maxWidth: '95vw' })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.snackBar.open(`Description of ${saved.name} saved`, 'OK', { duration: 3000 });
          this.products.reload();
        }
      });
  }
}
