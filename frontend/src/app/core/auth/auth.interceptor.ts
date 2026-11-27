import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, throwError } from 'rxjs';
import { AuthActions } from './auth.actions';
import { selectToken } from './auth.selectors';

/**
 * Adds "Authorization: Bearer <access token>" to the shop's API calls (/api/..., never to other hosts such as
 * the auth server), unless the request already carries one. A 401 on such a call means the session is over:
 * it is reported as AuthActions.sessionExpired, and AuthEffects takes the user through sign-in again.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const token = store.selectSignal(selectToken)();

  const isApi = req.url.startsWith('/api/');
  const addToken = isApi && token !== null && !req.headers.has('Authorization');
  const request = addToken ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && addToken) {
        store.dispatch(AuthActions.sessionExpired());
      }
      return throwError(() => err);
    }),
  );
};
