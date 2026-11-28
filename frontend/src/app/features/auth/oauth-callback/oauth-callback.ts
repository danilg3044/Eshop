import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../../core/auth/auth.actions';
import { selectAuthError } from '../../../core/auth/auth.selectors';

/**
 * Where cloud/auth-server sends the browser back after sign-in: ?code=...&state=... (traded for tokens by
 * AuthEffects), or ?error=...&error_description=... when the auth server refused.
 */
@Component({
  selector: 'app-oauth-callback',
  imports: [RouterLink, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './oauth-callback.html',
  styleUrl: './oauth-callback.scss',
})
export class OAuthCallback implements OnInit {
  private readonly store = inject(Store);

  readonly code = input<string>();
  readonly state = input<string>();
  readonly error = input<string>();
  readonly errorDescription = input<string>(undefined, { alias: 'error_description' });

  /** A problem we see in the URL itself, before asking the server. */
  private readonly urlProblem = signal<string | null>(null);
  private readonly exchangeError = this.store.selectSignal(selectAuthError);
  /** Either that, or the exchange failing (store error, set by AuthEffects). */
  protected readonly failure = computed(() => this.urlProblem() ?? this.exchangeError());

  ngOnInit(): void {
    const code = this.code();
    const state = this.state();
    if (this.error() || !code || !state) {
      this.urlProblem.set(this.errorDescription() || this.error() || 'The sign-in did not complete.');
      return;
    }
    // AuthEffects checks the state, trades code + PKCE verifier for tokens, loads the user and navigates.
    this.store.dispatch(AuthActions.exchangeCode({ code, state }));
  }
}
