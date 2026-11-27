import { Component, inject, input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../core/auth/auth.actions';
import { selectAuthError } from '../../core/auth/auth.selectors';

/**
 * Sign-in happens at cloud/auth-server (its own pages: email + password, registration, Google/Facebook).
 * This route only starts that: the guards send people here with a returnUrl, and AuthEffects redirects.
 */
@Component({
  selector: 'app-login',
  imports: [MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <mat-card class="auth-card">
      <mat-card-content>
        @if (error(); as message) {
          <h1>Sign in</h1>
          <p class="form-error" role="alert">{{ message }}</p>
          <button mat-flat-button type="button" (click)="signIn()">Try again</button>
        } @else {
          <div class="redirecting" role="status">
            <mat-spinner diameter="40" aria-hidden="true" />
            <p>Taking you to the sign-in page…</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: './auth.scss',
  styles: `
    .redirecting { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 24px 0; }
  `,
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
