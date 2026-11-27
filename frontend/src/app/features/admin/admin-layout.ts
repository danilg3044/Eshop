import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../core/auth/auth.actions';
import { selectEmail } from '../../core/auth/auth.selectors';

/** Back-office frame: dark toolbar + side navigation, visually distinct from the shop. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatSidenavModule, MatListModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar class="bar">
      <mat-icon aria-hidden="true">admin_panel_settings</mat-icon>
      <span class="title">EShop back office</span>
      <span class="spacer"></span>
      <span class="who">{{ email() }}</span>
      <a mat-button routerLink="/">View shop</a>
      <button mat-button (click)="logout()">Sign out</button>
    </mat-toolbar>
    <mat-sidenav-container class="container">
      <mat-sidenav mode="side" opened>
        <mat-nav-list aria-label="Admin sections">
          <a mat-list-item routerLink="orders" routerLinkActive #o="routerLinkActive" [activated]="o.isActive">
            <mat-icon matListItemIcon>receipt_long</mat-icon><span matListItemTitle>Orders</span>
          </a>
          <a mat-list-item routerLink="products" routerLinkActive #p="routerLinkActive" [activated]="p.isActive">
            <mat-icon matListItemIcon>inventory_2</mat-icon><span matListItemTitle>Products</span>
          </a>
          <a mat-list-item routerLink="users" routerLinkActive #u="routerLinkActive" [activated]="u.isActive">
            <mat-icon matListItemIcon>group</mat-icon><span matListItemTitle>Users</span>
          </a>
          <a mat-list-item routerLink="profile" routerLinkActive #m="routerLinkActive" [activated]="m.isActive">
            <mat-icon matListItemIcon>badge</mat-icon><span matListItemTitle>My profile</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <main class="page"><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100vh; }
    .bar { background: #263238; color: #fff; gap: 8px; }
    .bar a, .bar button { color: #fff; }
    .title { font: var(--mat-sys-title-large); }
    .spacer { flex: 1; }
    .who { font: var(--mat-sys-body-medium); opacity: 0.85; }
    .container { flex: 1; }
    mat-sidenav { width: 220px; }
    .page { padding: 24px; }
  `,
})
export class AdminLayout {
  private readonly store = inject(Store);
  protected readonly email = this.store.selectSignal(selectEmail);

  protected logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
