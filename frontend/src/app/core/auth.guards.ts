import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Lets signed-in users through; everyone else goes to /login and comes back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.isLoggedIn()
    ? true
    : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Admin area only. Signed-out visitors go to /login; signed-in customers go back to the shop.
 * This only hides the UI; the server enforces the ADMIN role on every /api/admin call.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) {
    return true;
  }
  return auth.isLoggedIn()
    ? router.createUrlTree(['/'])
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
