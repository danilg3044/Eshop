import { Component, inject, linkedSignal, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../../core/auth/auth.actions';
import { selectUser } from '../../../core/auth/auth.selectors';
import { errorMessage } from '../../../core/errors';
import { Profile } from '../../../core/models';
import { ShopApi } from '../../../core/shop-api';

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
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  private readonly store = inject(Store);
  private readonly api = inject(ShopApi);

  protected readonly user = this.store.selectSignal(selectUser);
  /** Follows the stored user (refilled whenever it changes) but stays editable: that's linkedSignal. */
  private readonly model = linkedSignal<ProfileForm>(() => normalize(this.user()?.profile));
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
            this.store.dispatch(AuthActions.userLoaded({ user })); // header, checkout etc. see the change
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
    return (this.user()?.provider ?? 'LOCAL').toLowerCase().replace('local', 'email & password');
  }

  constructor() {
    this.store.dispatch(AuthActions.loadUser()); // show the latest server copy
  }
}

/** Turn nulls from the server into ''. */
function normalize(p: Profile | undefined): ProfileForm {
  if (!p) {
    return EMPTY;
  }
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
