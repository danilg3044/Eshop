import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../../core/auth/auth.actions';
import { selectEmail } from '../../../core/auth/auth.selectors';

/** Back-office frame: dark toolbar + side navigation, visually distinct from the shop. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatSidenavModule, MatListModule, MatButtonModule, MatIconModule],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  private readonly store = inject(Store);
  protected readonly email = this.store.selectSignal(selectEmail);

  protected logout(): void {
    this.store.dispatch(AuthActions.logout());
  }
}
