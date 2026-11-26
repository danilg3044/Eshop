import { Component, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/errors';
import { Profile } from '../../core/models';
import { ShopApi } from '../../core/shop-api';

/** Text inputs edit strings, so the form model has no nulls. */
type ProfileForm = { [K in keyof Profile]: string };

const EMPTY: ProfileForm = {
  firstName: '',
  lastName: '',
  phone: '',
  addressLine: '',
  city: '',
  postalCode: '',
  country: '',
};

/** Edit your own profile. Used by both customers (/profile) and admins (/admin/profile). */
@Component({
  selector: 'app-profile-page',
  imports: [FormField, FormRoot, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <mat-card class="narrow">
      <mat-card-header>
        <mat-card-title><h1>My profile</h1></mat-card-title>
        <mat-card-subtitle>{{ auth.user()?.email }} · signed in with {{ provider() }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form [formRoot]="profileForm" class="grid">
          <mat-form-field>
            <mat-label>First name</mat-label>
            <input matInput [formField]="profileForm.firstName" autocomplete="given-name" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Last name</mat-label>
            <input matInput [formField]="profileForm.lastName" autocomplete="family-name" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Phone</mat-label>
            <input matInput [formField]="profileForm.phone" autocomplete="tel" />
          </mat-form-field>
          <mat-form-field class="wide">
            <mat-label>Address</mat-label>
            <input matInput [formField]="profileForm.addressLine" autocomplete="street-address" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>City</mat-label>
            <input matInput [formField]="profileForm.city" autocomplete="address-level2" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Postal code</mat-label>
            <input matInput [formField]="profileForm.postalCode" autocomplete="postal-code" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>Country</mat-label>
            <input matInput [formField]="profileForm.country" autocomplete="country-name" />
          </mat-form-field>

          <div class="wide actions">
            <button mat-flat-button type="submit" [disabled]="profileForm().submitting()">Save</button>
            @if (status(); as s) {
              <span role="status" [class.error]="s.error">{{ s.text }}</span>
            }
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .narrow { max-width: 720px; margin: 24px auto; }
    h1 { margin: 0; font: var(--mat-sys-headline-small); }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; margin-top: 16px; }
    .wide { grid-column: 1 / -1; }
    .actions { display: flex; gap: 16px; align-items: center; }
    .error { color: var(--mat-sys-error); }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ShopApi);

  private readonly model = signal<ProfileForm>(EMPTY);
  protected readonly status = signal<{ text: string; error: boolean } | null>(null);

  protected readonly profileForm = form(
    this.model,
    (p) => {
      maxLength(p.firstName, 100);
      maxLength(p.lastName, 100);
      maxLength(p.phone, 40, { message: 'At most 40 characters' });
      maxLength(p.postalCode, 20, { message: 'At most 20 characters' });
    },
    {
      submission: {
        action: async () => {
          this.status.set(null);
          try {
            const user = await firstValueFrom(this.api.updateProfile(this.model()));
            this.auth.user.set(user);
            this.status.set({ text: 'Profile saved', error: false });
          } catch (err) {
            this.status.set({ text: errorMessage(err), error: true });
          }
          return undefined;
        },
      },
    },
  );

  protected provider(): string {
    return (this.auth.user()?.provider ?? 'LOCAL').toLowerCase().replace('local', 'email & password');
  }

  constructor() {
    this.auth.loadCurrentUser().subscribe((u) => this.model.set(this.normalize(u.profile)));
  }

  /** Turn nulls from the server into ''. */
  private normalize(p: Profile): ProfileForm {
    return {
      firstName: p.firstName ?? '',
      lastName: p.lastName ?? '',
      phone: p.phone ?? '',
      addressLine: p.addressLine ?? '',
      city: p.city ?? '',
      postalCode: p.postalCode ?? '',
      country: p.country ?? '',
    };
  }
}
