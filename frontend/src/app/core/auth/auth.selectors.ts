import { createSelector } from '@ngrx/store';
import { Role } from '../models';
import { decodeJwt } from './auth.models';
import { authFeature } from './auth.reducer';

export const {
  selectToken,
  selectIdToken,
  selectUser,
  selectPending: selectAuthPending,
  selectError: selectAuthError,
} = authFeature;

/** Decoded once per token (memoized), not on every read. */
export const selectTokenPayload = createSelector(selectToken, (token) => (token ? decodeJwt(token) : null));

/**
 * Signed in = we hold a readable token. Expiry is handled by AuthEffects (expired tokens are dropped on
 * restore, and a timer dispatches sessionExpired at exp), so selectors stay pure: no Date.now() here.
 */
export const selectIsLoggedIn = createSelector(selectTokenPayload, (payload) => payload !== null);

export const selectRole = createSelector(selectTokenPayload, (payload): Role | null => payload?.role ?? null);

export const selectIsAdmin = createSelector(selectRole, (role) => role === 'ADMIN');

export const selectEmail = createSelector(
  selectUser,
  selectTokenPayload,
  (user, payload) => user?.email ?? payload?.email ?? null,
);

export const selectProfile = createSelector(selectUser, (user) => user?.profile ?? null);
