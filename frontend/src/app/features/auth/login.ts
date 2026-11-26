import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/errors';
import { FieldError } from '../shared/field-error';

/**
 * One sign-in page for everybody. Customers may also use Google/Facebook;
 * when the target is the admin area only email + password is offered (admins are local accounts).
 */
@Component({
  selector: 'app-login',
  imports: [
    FormField, FormRoot, FieldError, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDividerModule,
  ],
  template: `
    <mat-card class="auth-card">
      <mat-card-header>
        <mat-card-title><h1>{{ forAdmin() ? 'Administrator sign in' : 'Sign in' }}</h1></mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formRoot]="loginForm">
          <mat-form-field>
            <mat-label>Email</mat-label>
            <input matInput type="email" autocomplete="username" [formField]="loginForm.email" />
          </mat-form-field>
          <app-field-error [field]="loginForm.email" />

          <mat-form-field>
            <mat-label>Password</mat-label>
            <input matInput type="password" autocomplete="current-password" [formField]="loginForm.password" />
          </mat-form-field>
          <app-field-error [field]="loginForm.password" />

          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          <button mat-flat-button type="submit" [disabled]="loginForm().submitting()">Sign in</button>
        </form>

        @if (!forAdmin() && providers().length) {
          <mat-divider />
          <p class="or">or continue with</p>
          <div class="social">
            @for (p of providers(); track p) {
              <a mat-stroked-button [href]="auth.socialLoginUrl(p)" [attr.data-provider]="p">{{ label(p) }}</a>
            }
          </div>
        }
      </mat-card-content>
      @if (!forAdmin()) {
        <mat-card-actions>
          <span>New here?</span>
          <a mat-button routerLink="/register" [queryParams]="{ returnUrl: returnUrl() }">Create an account</a>
        </mat-card-actions>
      }
    </mat-card>
  `,
  styleUrl: './auth.scss',
})
export class Login {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Where to go after signing in (set by the guards). Bound from the query string. */
  readonly returnUrl = input<string>();

  protected readonly forAdmin = computed(() => this.returnUrl()?.startsWith('/admin') ?? false);
  protected readonly error = signal<string | null>(null);
  protected readonly providers = toSignal(this.auth.providers().pipe(catchError(() => of<string[]>([]))), {
    initialValue: [],
  });

  private readonly model = signal({ email: '', password: '' });
  protected readonly loginForm = form(
    this.model,
    (p) => {
      required(p.email, { message: 'Email is required' });
      email(p.email, { message: 'Enter a valid email address' });
      required(p.password, { message: 'Password is required' });
    },
    {
      submission: {
        action: async () => {
          this.error.set(null);
          try {
            const { email, password } = this.model();
            const user = await firstValueFrom(this.auth.login(email, password));
            const fallback = user.role === 'ADMIN' ? '/admin' : '/';
            await this.router.navigateByUrl(this.returnUrl() || fallback);
          } catch (err) {
            this.error.set(errorMessage(err, 'Sign in failed'));
          }
          return undefined;
        },
      },
    },
  );

  protected label(provider: string): string {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}
