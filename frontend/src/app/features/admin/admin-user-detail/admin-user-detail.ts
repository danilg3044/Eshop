import { CurrencyPipe, DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { UserDetail } from '../../../core/models';
import { StatusChip } from '../../shared/status-chip/status-chip';

/** A registered user's profile and order history. */
@Component({
  selector: 'app-admin-user-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule, StatusChip],
  templateUrl: './admin-user-detail.html',
  styleUrl: './admin-user-detail.scss',
})
export class AdminUserDetail {
  readonly id = input.required<string>();
  protected readonly detail = httpResource<UserDetail>(() => `/api/admin/users/${this.id()}`);
}
