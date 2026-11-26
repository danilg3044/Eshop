import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { Page, Role, UserSummary } from '../../core/models';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, RouterLink, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatButtonToggleModule, MatIconModule],
  template: `
    <h1>Registered users</h1>
    <div class="filters">
      <mat-form-field class="search" subscriptSizing="dynamic">
        <mat-label>Search by email or name</mat-label>
        <input matInput #box (keyup.enter)="search(box.value)" />
        <button matSuffix mat-icon-button aria-label="Search" (click)="search(box.value)"><mat-icon>search</mat-icon></button>
      </mat-form-field>
      <mat-button-toggle-group [value]="role()" (change)="setRole($event.value)" aria-label="Role">
        <mat-button-toggle value="">All</mat-button-toggle>
        <mat-button-toggle value="USER">Customers</mat-button-toggle>
        <mat-button-toggle value="ADMIN">Admins</mat-button-toggle>
      </mat-button-toggle-group>
    </div>

    @if (users.hasValue()) {
      @let page = users.value();
      <table mat-table [dataSource]="page.content" class="mat-elevation-z1">
        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let s"><a [routerLink]="[s.user.id]">{{ s.user.email }}</a></td>
        </ng-container>
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let s">{{ s.user.profile.firstName }} {{ s.user.profile.lastName }}</td>
        </ng-container>
        <ng-container matColumnDef="role">
          <th mat-header-cell *matHeaderCellDef>Role</th>
          <td mat-cell *matCellDef="let s">{{ s.user.role }}</td>
        </ng-container>
        <ng-container matColumnDef="provider">
          <th mat-header-cell *matHeaderCellDef>Sign-in</th>
          <td mat-cell *matCellDef="let s">{{ s.user.provider }}</td>
        </ng-container>
        <ng-container matColumnDef="orders">
          <th mat-header-cell *matHeaderCellDef>Orders</th>
          <td mat-cell *matCellDef="let s">{{ s.orderCount }}</td>
        </ng-container>
        <ng-container matColumnDef="created">
          <th mat-header-cell *matHeaderCellDef>Registered</th>
          <td mat-cell *matCellDef="let s">{{ s.user.createdAt | date: 'mediumDate' }}</td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      <mat-paginator [length]="page.totalElements" [pageIndex]="page.page" [pageSize]="page.size"
                     [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" aria-label="User pages" />
    }
  `,
  styles: `
    h1 { font: var(--mat-sys-headline-medium); margin-top: 0; }
    .filters { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-bottom: 16px; }
    .search { flex: 1; max-width: 480px; }
    table { width: 100%; }
  `,
})
export class AdminUsers {
  protected readonly columns = ['email', 'name', 'role', 'provider', 'orders', 'created'];
  protected readonly role = signal<Role | ''>('');
  private readonly query = signal('');
  private readonly paging = signal({ page: 0, size: 20 });

  protected readonly users = httpResource<Page<UserSummary>>(() => ({
    url: '/api/admin/users',
    params: { q: this.query(), ...(this.role() ? { role: this.role() } : {}), ...this.paging() },
  }));

  protected search(text: string): void {
    this.query.set(text.trim());
    this.paging.update((p) => ({ ...p, page: 0 }));
  }

  protected setRole(role: Role | ''): void {
    this.role.set(role);
    this.paging.update((p) => ({ ...p, page: 0 }));
  }

  protected onPage(e: PageEvent): void {
    this.paging.set({ page: e.pageIndex, size: e.pageSize });
  }
}
