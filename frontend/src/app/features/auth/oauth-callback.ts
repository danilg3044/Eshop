import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/errors';

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
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly code = input<string>();
  readonly error = input<string>();

  protected readonly failure = signal<string | null>(null);

  ngOnInit(): void {
    const code = this.code();
    if (this.error() || !code) {
      this.failure.set(this.error() || 'No login code was received.');
      return;
    }
    this.auth.exchangeCode(code).subscribe({
      next: () => void this.router.navigateByUrl('/', { replaceUrl: true }),
      error: (err: unknown) => this.failure.set(errorMessage(err, 'The login link has expired. Please try again.')),
    });
  }
}
