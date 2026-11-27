import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectIsAdmin, selectIsLoggedIn } from './auth.selectors';

/** Lets signed-in users through; everyone else goes to /login and comes back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const isLoggedIn = inject(Store).selectSignal(selectIsLoggedIn);
  return isLoggedIn()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Admin area only. Signed-out visitors go to /login; signed-in customers go back to the shop.
 * This only hides the UI; the server enforces the ADMIN role on every /api/admin call.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const store = inject(Store);
  const router = inject(Router);
  if (store.selectSignal(selectIsAdmin)()) {
    return true;
  }
  return store.selectSignal(selectIsLoggedIn)()
    ? router.createUrlTree(['/'])
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
