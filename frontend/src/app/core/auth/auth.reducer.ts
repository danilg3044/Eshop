import { createFeature, createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { AuthState } from './auth.models';

export const initialAuthState: AuthState = { token: null, idToken: null, user: null, pending: false, error: null };

/** Pure state transitions only. Redirects, HTTP, sessionStorage, timers and navigation live in AuthEffects. */
export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialAuthState,
    on(AuthActions.login, AuthActions.exchangeCode, (state) => ({ ...state, pending: true, error: null })),
    on(AuthActions.signInSucceeded, (state, { token, idToken, user }) => ({
      ...state,
      token,
      idToken,
      user,
      pending: false,
      error: null,
    })),
    on(AuthActions.signInFailed, (state, { error }) => ({ ...state, pending: false, error })),
    on(AuthActions.restored, (state, { token, idToken }) => ({ ...state, token, idToken })),
    on(AuthActions.userLoaded, (state, { user }) => ({ ...state, user })),
    // Logout keeps the state until AuthEffects has read the ID token for the auth server's logout.
    on(AuthActions.loggedOut, AuthActions.sessionExpired, () => initialAuthState),
  ),
});
