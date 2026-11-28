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
import { Page, Role, UserSummary } from '../../../core/models';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, RouterLink, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatButtonToggleModule, MatIconModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
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
