import { CurrencyPipe, DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { UserDetail } from '../../core/models';
import { StatusChip } from '../shared/status-chip';

/** A registered user's profile and order history. */
@Component({
  selector: 'app-admin-user-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule, StatusChip],
  template: `
    <a mat-button routerLink="../"><mat-icon>arrow_back</mat-icon> All users</a>
    @if (detail.hasValue()) {
      @let u = detail.value().user;
      <mat-card class="profile">
        <mat-card-header>
          <mat-card-title><h1>{{ u.profile.firstName }} {{ u.profile.lastName }}</h1></mat-card-title>
          <mat-card-subtitle>{{ u.email }} · {{ u.role }} · signs in with {{ u.provider }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <dl>
            <dt>Phone</dt><dd>{{ u.profile.phone || '—' }}</dd>
            <dt>Address</dt>
            <dd>{{ u.profile.addressLine || '—' }} {{ u.profile.city }} {{ u.profile.postalCode }} {{ u.profile.country }}</dd>
            <dt>Registered</dt><dd>{{ u.createdAt | date: 'medium' }}</dd>
            <dt>Account</dt><dd>{{ u.enabled ? 'Enabled' : 'Disabled' }}</dd>
          </dl>
        </mat-card-content>
      </mat-card>

      <h2>Orders ({{ detail.value().orders.length }})</h2>
      <table class="orders">
        <thead><tr><th scope="col">#</th><th scope="col">Date</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead>
        <tbody>
          @for (o of detail.value().orders; track o.id) {
            <tr>
              <td>{{ o.id }}</td>
              <td>{{ o.createdAt | date: 'short' }}</td>
              <td>{{ o.items.length }}</td>
              <td>{{ o.total | currency }}</td>
              <td><app-status-chip [status]="o.status" /></td>
            </tr>
          } @empty {
            <tr><td colspan="5">No orders yet.</td></tr>
          }
        </tbody>
      </table>
    } @else if (detail.error()) {
      <p role="alert">User not found.</p>
    }
  `,
  styles: `
    .profile { margin: 16px 0; }
    h1 { font: var(--mat-sys-headline-small); margin: 0; }
    h2 { font: var(--mat-sys-title-large); }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 8px 24px; }
    dt { color: var(--mat-sys-on-surface-variant); }
    dd { margin: 0; }
    .orders { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
  `,
})
export class AdminUserDetail {
  readonly id = input.required<string>();
  protected readonly detail = httpResource<UserDetail>(() => `/api/admin/users/${this.id()}`);
}
