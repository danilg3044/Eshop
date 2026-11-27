import { Action } from '@ngrx/store';
import { fakeJwt } from '../../testing/fake-jwt';
import { fakeUser } from '../../testing/fake-user';
import { AuthActions } from './auth.actions';
import { AuthState, JwtPayload } from './auth.models';
import { authFeature, initialAuthState } from './auth.reducer';
import { selectEmail, selectIsAdmin, selectIsLoggedIn, selectProfile, selectRole } from './auth.selectors';

const reduce = (...actions: Action[]): AuthState => actions.reduce(authFeature.reducer, initialAuthState);
const login = AuthActions.login({ email: 'dana@example.com', password: 'x', returnUrl: null });

describe('auth reducer', () => {
  it('marks a sign-in as pending and clears the previous error', () => {
    const state = reduce(AuthActions.signInFailed({ error: 'nope' }), login);

    expect(state.pending).toBe(true);
    expect(state.error).toBeNull();
  });

  it('stores token and user on success', () => {
    const token = fakeJwt();
    const state = reduce(login, AuthActions.signInSucceeded({ token, user: fakeUser(), returnUrl: null }));

    expect(state).toEqual({ token, user: fakeUser(), pending: false, error: null });
  });

  it('keeps the error of a failed sign-in until cleared', () => {
    const failed = reduce(login, AuthActions.signInFailed({ error: 'Invalid email or password' }));
    expect(failed.pending).toBe(false);
    expect(failed.error).toBe('Invalid email or password');

    expect(authFeature.reducer(failed, AuthActions.clearError()).error).toBeNull();
  });

  it('restores a token and later its user', () => {
    const token = fakeJwt();
    const state = reduce(AuthActions.restored({ token }), AuthActions.userLoaded({ user: fakeUser() }));

    expect(state.token).toBe(token);
    expect(state.user?.email).toBe('dana@example.com');
  });

  it('forgets everything on logout and on session expiry', () => {
    const signedIn = reduce(AuthActions.signInSucceeded({ token: fakeJwt(), user: fakeUser(), returnUrl: null }));

    expect(authFeature.reducer(signedIn, AuthActions.logout())).toEqual(initialAuthState);
    expect(authFeature.reducer(signedIn, AuthActions.sessionExpired())).toEqual(initialAuthState);
  });
});

describe('auth selectors', () => {
  const state = (token: string | null, user = fakeUser()) => ({ auth: { ...initialAuthState, token, user } });

  it('derives login state and role from the token', () => {
    expect(selectIsLoggedIn(state(null))).toBe(false);
    expect(selectIsLoggedIn(state(fakeJwt()))).toBe(true);
    expect(selectIsLoggedIn(state('not-a-jwt'))).toBe(false);
    expect(selectRole(state(fakeJwt({ role: 'ADMIN' })))).toBe('ADMIN');
    expect(selectIsAdmin(state(fakeJwt({ role: 'USER' })))).toBe(false);
  });

  it('takes the email from the user, falling back to the token before the user has loaded', () => {
    const payload: JwtPayload = { sub: '1', email: 'from@token.com', role: 'USER', exp: 0 };
    expect(selectEmail.projector(fakeUser('USER', 'from@user.com'), payload)).toBe('from@user.com');
    expect(selectEmail.projector(null, payload)).toBe('from@token.com');
    expect(selectEmail.projector(null, null)).toBeNull();
  });

  it('exposes the profile', () => {
    expect(selectProfile(state(fakeJwt()))?.city).toBe('Haifa');
    expect(selectProfile({ auth: initialAuthState })).toBeNull();
  });
});
