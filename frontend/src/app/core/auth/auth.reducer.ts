import { createFeature, createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { AuthState } from './auth.models';

export const initialAuthState: AuthState = { token: null, user: null, pending: false, error: null };

/** Pure state transitions only. HTTP, sessionStorage, timers and navigation live in AuthEffects. */
export const authFeature = createFeature({
  name: 'auth',
  reducer: createReducer(
    initialAuthState,
    on(AuthActions.login, AuthActions.register, AuthActions.exchangeCode, (state) => ({
      ...state,
      pending: true,
      error: null,
    })),
    on(AuthActions.signInSucceeded, (state, { token, user }) => ({ ...state, token, user, pending: false, error: null })),
    on(AuthActions.signInFailed, (state, { error }) => ({ ...state, pending: false, error })),
    on(AuthActions.clearError, (state) => ({ ...state, error: null })),
    on(AuthActions.restored, (state, { token }) => ({ ...state, token })),
    on(AuthActions.userLoaded, (state, { user }) => ({ ...state, user })),
    on(AuthActions.logout, AuthActions.sessionExpired, () => initialAuthState),
  ),
});
