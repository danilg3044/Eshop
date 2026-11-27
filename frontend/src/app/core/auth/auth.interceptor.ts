import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, throwError } from 'rxjs';
import { AuthActions } from './auth.actions';
import { selectToken } from './auth.selectors';

/**
 * Adds "Authorization: Bearer <jwt>" to API calls (unless the request already carries one), and reports
 * a 401 as AuthActions.sessionExpired; AuthEffects then clears the session and goes to the login page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const token = store.selectSignal(selectToken)();

  const isApi = req.url.startsWith('/api/');
  const addToken = isApi && token !== null && !req.headers.has('Authorization');
  const request = addToken ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      const isSignInCall = /^\/api\/auth\/(login|register|exchange)\b/.test(req.url); // wrong password != expired session
      if (err instanceof HttpErrorResponse && err.status === 401 && addToken && !isSignInCall) {
        store.dispatch(AuthActions.sessionExpired());
      }
      return throwError(() => err);
    }),
  );
};
