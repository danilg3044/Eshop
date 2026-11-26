import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';

/** Customer-facing frame: top bar with cart and account menu, then the routed page. */
@Component({
  selector: 'app-shop-layout',
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatBadgeModule, MatMenuModule],
  template: `
    <mat-toolbar class="bar">
      <a routerLink="/" class="brand">EShop</a>
      <span class="spacer"></span>
      <a mat-icon-button routerLink="/cart" aria-label="Shopping cart, {{ cart.count() }} items">
        <mat-icon [matBadge]="cart.count() || null" matBadgeColor="accent" aria-hidden="false">shopping_cart</mat-icon>
      </a>
      @if (auth.isLoggedIn()) {
        <button mat-button [matMenuTriggerFor]="account" data-testid="account-menu">
          <mat-icon>account_circle</mat-icon> {{ auth.email() }}
        </button>
        <mat-menu #account="matMenu">
          <a mat-menu-item routerLink="/orders">My orders</a>
          <a mat-menu-item routerLink="/profile">Profile</a>
          @if (auth.isAdmin()) {
            <a mat-menu-item routerLink="/admin">Back office</a>
          }
          <button mat-menu-item (click)="logout()">Sign out</button>
        </mat-menu>
      } @else {
        <a mat-button routerLink="/login">Sign in</a>
      }
    </mat-toolbar>

    <main class="page">
      <router-outlet />
    </main>

    <footer>
      <span>EShop sample store</span>
      <a routerLink="/admin">Administration</a>
    </footer>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .bar { position: sticky; top: 0; z-index: 10; background: var(--mat-sys-primary-container); }
    .brand { color: inherit; text-decoration: none; font: var(--mat-sys-title-large); font-weight: 600; }
    .spacer { flex: 1; }
    .page { flex: 1; width: 100%; max-width: 1200px; margin: 0 auto; padding: 16px; box-sizing: border-box; }
    footer { display: flex; justify-content: space-between; padding: 16px 24px;
             color: var(--mat-sys-on-surface-variant); border-top: 1px solid var(--mat-sys-outline-variant); }
    footer a { color: inherit; }
  `,
})
export class ShopLayout {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
