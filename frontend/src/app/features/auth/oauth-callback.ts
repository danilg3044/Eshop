import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../core/auth/auth.actions';
import { selectAuthError } from '../../core/auth/auth.selectors';

/**
 * Landing page after Google/Facebook login. The backend redirects here with either
 * ?code=<one-time code> (traded for a JWT) or ?error=<message>.
 */
@Component({
  selector: 'app-oauth-callback',
  imports: [RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <section class="callback">
      @if (failure(); as msg) {
        <h1>Sign in failed</h1>
        <p role="alert">{{ msg }}</p>
        <a mat-flat-button routerLink="/login">Back to sign in</a>
      } @else {
        <mat-spinner diameter="40" aria-label="Signing you in" />
        <p>Signing you in…</p>
      }
    </section>
  `,
  styles: `
    .callback { display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 80px; }
    h1 { font: var(--mat-sys-headline-small); }
  `,
})
export class OAuthCallback implements OnInit {
  private readonly store = inject(Store);

  readonly code = input<string>();
  readonly error = input<string>();

  /** A problem we see in the URL itself, before asking the server. */
  private readonly urlProblem = signal<string | null>(null);
  private readonly exchangeError = this.store.selectSignal(selectAuthError);
  /** Either that, or the exchange failing (store error, set by AuthEffects). */
  protected readonly failure = computed(() => this.urlProblem() ?? this.exchangeError());

  ngOnInit(): void {
    const code = this.code();
    if (this.error() || !code) {
      this.urlProblem.set(this.error() || 'No login code was received.');
      return;
    }
    // AuthEffects trades the code for a JWT, loads the user and navigates on success.
    this.store.dispatch(AuthActions.exchangeCode({ code }));
  }
}
