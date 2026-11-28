import { Component, inject, input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../../core/auth/auth.actions';
import { selectAuthError } from '../../../core/auth/auth.selectors';

/**
 * Sign-in happens at cloud/auth-server (its own pages: email + password, registration, Google/Facebook).
 * This route only starts that: the guards send people here with a returnUrl, and AuthEffects redirects.
 */
@Component({
  selector: 'app-login',
  imports: [MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './login.html',
  styleUrls: ['../auth.scss', './login.scss'],
})
export class Login implements OnInit {
  private readonly store = inject(Store);

  /** Where to go after signing in (set by the guards). Bound from the query string. */
  readonly returnUrl = input<string>();

  protected readonly error = this.store.selectSignal(selectAuthError);

  ngOnInit(): void {
    this.signIn();
  }

  protected signIn(): void {
    this.store.dispatch(AuthActions.login({ returnUrl: this.returnUrl() ?? null }));
  }
}
