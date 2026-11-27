import { Component, inject, input, signal } from '@angular/core';
import { email, form, FormField, FormRoot, maxLength, minLength, required } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../core/auth/auth.actions';
import { Registration } from '../../core/auth/auth.models';
import { selectAuthError, selectAuthPending } from '../../core/auth/auth.selectors';
import { FieldError } from '../shared/field-error';

/** Customer self-registration (admins are never created here). Signs the user in on success. */
@Component({
  selector: 'app-register',
  imports: [FormField, FormRoot, FieldError, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <mat-card class="auth-card">
      <mat-card-header>
        <mat-card-title><h1>Create your account</h1></mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formRoot]="registerForm">
          <mat-form-field>
            <mat-label>First name</mat-label>
            <input matInput autocomplete="given-name" [formField]="registerForm.firstName" />
          </mat-form-field>
          <app-field-error [field]="registerForm.firstName" />

          <mat-form-field>
            <mat-label>Last name</mat-label>
            <input matInput autocomplete="family-name" [formField]="registerForm.lastName" />
          </mat-form-field>
          <app-field-error [field]="registerForm.lastName" />

          <mat-form-field>
            <mat-label>Email</mat-label>
            <input matInput type="email" autocomplete="email" [formField]="registerForm.email" />
          </mat-form-field>
          <app-field-error [field]="registerForm.email" />

          <mat-form-field>
            <mat-label>Password</mat-label>
            <input matInput type="password" autocomplete="new-password" [formField]="registerForm.password" />
            <mat-hint>At least 8 characters</mat-hint>
          </mat-form-field>
          <app-field-error [field]="registerForm.password" />

          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          <button mat-flat-button type="submit" [disabled]="pending()">Create account</button>
        </form>
      </mat-card-content>
      <mat-card-actions>
        <span>Already registered?</span>
        <a mat-button routerLink="/login" [queryParams]="{ returnUrl: returnUrl() }">Sign in</a>
      </mat-card-actions>
    </mat-card>
  `,
  styleUrl: './auth.scss',
})
export class Register {
  private readonly store = inject(Store);

  readonly returnUrl = input<string>();
  protected readonly pending = this.store.selectSignal(selectAuthPending);
  protected readonly error = this.store.selectSignal(selectAuthError);

  private readonly model = signal<Registration>({ firstName: '', lastName: '', email: '', password: '' });
  protected readonly registerForm = form(
    this.model,
    (p) => {
      required(p.firstName, { message: 'First name is required' });
      maxLength(p.firstName, 100);
      required(p.lastName, { message: 'Last name is required' });
      maxLength(p.lastName, 100);
      required(p.email, { message: 'Email is required' });
      email(p.email, { message: 'Enter a valid email address' });
      required(p.password, { message: 'Password is required' });
      minLength(p.password, 8, { message: 'Password must be at least 8 characters' });
    },
    {
      submission: {
        // Success signs the user in and navigates (AuthEffects); failure sets the store's error.
        action: async () => {
          this.store.dispatch(AuthActions.register({ registration: this.model(), returnUrl: this.returnUrl() ?? null }));
          return undefined;
        },
      },
    },
  );

  constructor() {
    this.store.dispatch(AuthActions.clearError());
  }
}
