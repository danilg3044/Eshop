import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { catchError, EMPTY, exhaustMap, filter, map, Observable, of, OperatorFunction, switchMap, tap, timer } from 'rxjs';
import { errorMessage } from '../errors';
import { TokenResponse } from '../models';
import { AuthActions } from './auth.actions';
import { decodeJwt } from './auth.models';
import { AuthApi } from './auth-api';

export const TOKEN_STORAGE_KEY = 'eshop.token';

/**
 * Side effects of the session, each an RxJS pipeline over the action stream:
 * HTTP calls, sessionStorage (survives a reload, not closing the tab), the expiry timer and navigation.
 */
@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);

  // ---- sign in: exhaustMap ignores double-clicks while a request is in flight ----

  readonly login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ email, password, returnUrl }) =>
        this.api.login(email, password).pipe(this.signIn(returnUrl, 'Sign in failed')),
      ),
    ),
  );

  readonly register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      exhaustMap(({ registration, returnUrl }) =>
        this.api.register(registration).pipe(this.signIn(returnUrl, 'Registration failed')),
      ),
    ),
  );

  readonly exchangeCode$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.exchangeCode),
      exhaustMap(({ code }) =>
        this.api.exchangeCode(code).pipe(this.signIn(null, 'The login link has expired. Please try again.')),
      ),
    ),
  );

  // ---- startup and the user record ----

  /** At startup: take the saved token, unless it has already expired. */
  readonly restore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() => AuthActions.restored({ token: readValidToken() })),
    ),
  );

  readonly loadUserAfterRestore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.restored),
      filter(({ token }) => token !== null),
      map(() => AuthActions.loadUser()),
    ),
  );

  /** switchMap: a newer request replaces an older one. A 401 is handled by the interceptor (sessionExpired). */
  readonly loadUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loadUser),
      switchMap(() =>
        this.api.me().pipe(
          map((user) => AuthActions.userLoaded({ user })),
          catchError(() => EMPTY),
        ),
      ),
    ),
  );

  // ---- storage, expiry timer, navigation (dispatch: false = they emit no action) ----

  readonly persistToken$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signInSucceeded, AuthActions.logout, AuthActions.sessionExpired),
        tap((action) => writeToken(action.type === AuthActions.signInSucceeded.type ? action.token : null)),
      ),
    { dispatch: false },
  );

  /**
   * Signs out exactly when the JWT expires. Every session change restarts the pipeline; switchMap
   * cancels the previous timer, so logging out (or signing in again) never leaves a stale timer behind.
   */
  readonly expireSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signInSucceeded, AuthActions.restored, AuthActions.logout, AuthActions.sessionExpired),
      switchMap((action) => {
        const payload = 'token' in action && action.token ? decodeJwt(action.token) : null;
        return payload ? timer(new Date(payload.exp * 1000)).pipe(map(() => AuthActions.sessionExpired())) : EMPTY;
      }),
    ),
  );

  readonly navigateAfterSignIn$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signInSucceeded),
        // replaceUrl: Back doesn't return to the login page (or to a used social-login code)
        tap(({ user, returnUrl }) =>
          this.router.navigateByUrl(returnUrl || (user.role === 'ADMIN' ? '/admin' : '/'), { replaceUrl: true }),
        ),
      ),
    { dispatch: false },
  );

  readonly navigateAfterLogout$ = createEffect(
    () => this.actions$.pipe(ofType(AuthActions.logout), tap(() => this.router.navigateByUrl('/'))),
    { dispatch: false },
  );

  /** Back to the login page, which brings the user back here after signing in again. */
  readonly navigateAfterSessionExpired$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.sessionExpired),
        tap(() => this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } })),
      ),
    { dispatch: false },
  );

  /** Token response -> load the user with that token -> one success action (or a failure with the server's message). */
  private signIn(
    returnUrl: string | null,
    fallbackError: string,
  ): OperatorFunction<TokenResponse, ReturnType<typeof AuthActions.signInSucceeded | typeof AuthActions.signInFailed>> {
    return (tokens$: Observable<TokenResponse>) =>
      tokens$.pipe(
        switchMap(({ accessToken }) =>
          this.api.me(accessToken).pipe(map((user) => AuthActions.signInSucceeded({ token: accessToken, user, returnUrl }))),
        ),
        catchError((err: unknown) => of(AuthActions.signInFailed({ error: errorMessage(err, fallbackError) }))),
      );
  }
}

function readValidToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const payload = token ? decodeJwt(token) : null;
    return payload && payload.exp * 1000 > Date.now() ? token : null;
  } catch {
    return null;
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // storage unavailable: the session just won't survive a reload
  }
}
