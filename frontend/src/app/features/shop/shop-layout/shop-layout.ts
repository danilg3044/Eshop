import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthActions } from '../../../core/auth/auth.actions';
import { selectEmail, selectIsAdmin, selectIsLoggedIn } from '../../../core/auth/auth.selectors';
import { Store } from '@ngrx/store';
import { selectCartCount } from '../../../core/cart/cart.selectors';

/** Customer-facing frame: top bar with cart and account menu, then the routed page. */
@Component({
  selector: 'app-shop-layout',
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatBadgeModule, MatMenuModule],
  templateUrl: './shop-layout.html',
  styleUrl: './shop-layout.scss',
})
export class ShopLayout {
  private readonly store = inject(Store);
  protected readonly isLoggedIn = this.store.selectSignal(selectIsLoggedIn);
  protected readonly isAdmin = this.store.selectSignal(selectIsAdmin);
  protected readonly email = this.store.selectSignal(selectEmail);
  protected readonly cartCount = this.store.selectSignal(selectCartCount);

  protected logout(): void {
    this.store.dispatch(AuthActions.logout()); // AuthEffects clears storage and goes to the shop home
  }
}
