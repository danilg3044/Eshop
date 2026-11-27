import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, EMPTY, exhaustMap, filter, from, ignoreElements, map, of, switchMap, tap, timer } from 'rxjs';
import { errorMessage } from '../errors';
import { AuthActions } from './auth.actions';
import { decodeJwt, PendingSignIn } from './auth.models';
import { selectIdToken } from './auth.selectors';
import { AuthApi } from './auth-api';

export const SESSION_STORAGE_KEY = 'eshop.session';
export const PENDING_SIGN_IN_KEY = 'eshop.pendingSignIn';

/**
 * The OAuth2 Authorization Code + PKCE flow and the rest of the session's side effects, each an RxJS pipeline
 * over the action stream: redirects to cloud/auth-server, the token exchange, sessionStorage (survives a reload,
 * not closing the tab), the expiry timer and navigation.
 */
@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  // ---- sign in, step 1: off to the auth server ----

  /** Make a PKCE verifier + state, remember them for the callback, then leave for the sign-in page. */
  readonly login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ returnUrl }) =>
        from(this.api.createPkce()).pipe(
          tap(({ verifier, state, challenge }) => {
            writePendingSignIn({ verifier, state, returnUrl });
            this.api.redirect(this.api.authorizeUrl({ verifier, state, challenge }));
          }),
          ignoreElements(), // the page is being left: nothing to dispatch
          catchError(() => of(AuthActions.signInFailed({ error: 'Could not start the sign-in.' }))),
        ),
      ),
    ),
  );

  // ---- sign in, step 2: back at /auth/callback with ?code&state ----

  /** Check the state, trade code + verifier for tokens, load the shop user with the new token. */
  readonly exchangeCode$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.exchangeCode),
      exhaustMap(({ code, state }) => {
        const pending = takePendingSignIn();
        if (!pending || pending.state !== state) {
          // Not a sign-in this tab started (or a replayed link): never send such a code anywhere.
          return of(AuthActions.signInFailed({ error: 'This sign-in link is not valid any more. Please sign in again.' }));
        }
        return this.api.exchangeCode(code, pending.verifier).pipe(
          switchMap((tokens) =>
            this.api.me(tokens.access_token).pipe(
              map((user) =>
                AuthActions.signInSucceeded({
                  token: tokens.access_token,
                  idToken: tokens.id_token,
                  user,
                  returnUrl: pending.returnUrl,
                }),
              ),
            ),
          ),
          catchError((err: unknown) =>
            of(AuthActions.signInFailed({ error: errorMessage(err, 'Sign-in failed. Please try again.') })),
          ),
        );
      }),
    ),
  );

  // ---- startup and the user record ----

  /** At startup: take the saved tokens, unless the access token has already expired. */
  readonly restore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() => AuthActions.restored(readValidSession())),
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

  // ---- storage, expiry timer, navigation ----

  readonly persistSession$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.signInSucceeded, AuthActions.loggedOut, AuthActions.sessionExpired),
        tap((action) =>
          writeSession(action.type === AuthActions.signInSucceeded.type ? { token: action.token, idToken: action.idToken } : null),
        ),
      ),
    { dispatch: false },
  );

  /**
   * Signs out exactly when the access token expires. Every session change restarts the pipeline; switchMap
   * cancels the previous timer, so logging out (or signing in again) never leaves a stale timer behind.
   */
  readonly expireSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signInSucceeded, AuthActions.restored, AuthActions.loggedOut, AuthActions.sessionExpired),
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
        // replaceUrl: Back doesn't return to the used callback URL
        tap(({ user, returnUrl }) =>
          this.router.navigateByUrl(returnUrl || (user.role === 'ADMIN' ? '/admin' : '/'), { replaceUrl: true }),
        ),
      ),
    { dispatch: false },
  );

  /**
   * Forget the tokens here, then end the auth server's session too (OpenID Connect logout with the ID token),
   * which sends the browser back to the shop. Without the auth-server step, "Sign in" would silently sign the
   * same user in again.
   */
  readonly logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      concatLatestFrom(() => this.store.select(selectIdToken)),
      tap(([, idToken]) => {
        writeSession(null);
        if (idToken) {
          this.api.redirect(this.api.logoutUrl(idToken));
        } else {
          void this.router.navigateByUrl('/');
        }
      }),
      map(() => AuthActions.loggedOut()),
    ),
  );

  /**
   * To the login page, which goes straight on to the auth server. If its session is still alive, the user is
   * back with a fresh token without typing anything, on the page they were on.
   */
  readonly navigateAfterSessionExpired$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.sessionExpired),
        tap(() => this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } })),
      ),
    { dispatch: false },
  );
}

function readValidSession(): { token: string | null; idToken: string | null } {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as { token: string; idToken: string } | null;
    const payload = saved?.token ? decodeJwt(saved.token) : null;
    return payload && payload.exp * 1000 > Date.now() ? saved! : { token: null, idToken: null };
  } catch {
    return { token: null, idToken: null };
  }
}

function writeSession(session: { token: string; idToken: string } | null): void {
  try {
    if (session) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // storage unavailable: the session just won't survive a reload
  }
}

function writePendingSignIn(pending: PendingSignIn): void {
  sessionStorage.setItem(PENDING_SIGN_IN_KEY, JSON.stringify(pending)); // must work: the callback needs it
}

/** Read once and delete: a code can only be exchanged once anyway. */
function takePendingSignIn(): PendingSignIn | null {
  try {
    const pending = JSON.parse(sessionStorage.getItem(PENDING_SIGN_IN_KEY) ?? 'null') as PendingSignIn | null;
    sessionStorage.removeItem(PENDING_SIGN_IN_KEY);
    return pending;
  } catch {
    return null;
  }
}
