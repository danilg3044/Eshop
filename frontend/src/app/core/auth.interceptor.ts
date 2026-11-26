import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Adds "Authorization: Bearer <jwt>" to API calls, and sends the user to the login page
 * if the server says the session is no longer valid (401).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();

  const isApi = req.url.startsWith('/api/');
  const request = isApi && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      const isLoginCall = req.url.startsWith('/api/auth/');
      if (err instanceof HttpErrorResponse && err.status === 401 && isApi && token && !isLoginCall) {
        auth.logout();
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => err);
    }),
  );
};
