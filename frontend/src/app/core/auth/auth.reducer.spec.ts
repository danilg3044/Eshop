import { Action } from '@ngrx/store';
import { fakeJwt } from '../../testing/fake-jwt';
import { fakeUser } from '../../testing/fake-user';
import { AuthActions } from './auth.actions';
import { AuthState, JwtPayload } from './auth.models';
import { authFeature, initialAuthState } from './auth.reducer';
import { selectEmail, selectIsAdmin, selectIsLoggedIn, selectProfile, selectRole } from './auth.selectors';

const reduce = (...actions: Action[]): AuthState => actions.reduce(authFeature.reducer, initialAuthState);
const succeeded = (token = fakeJwt()) =>
  AuthActions.signInSucceeded({ token, idToken: 'id-token', user: fakeUser(), returnUrl: null });

describe('auth reducer', () => {
  it('marks a sign-in as pending and clears the previous error', () => {
    const state = reduce(AuthActions.signInFailed({ error: 'nope' }), AuthActions.exchangeCode({ code: 'c', state: 's' }));

    expect(state.pending).toBe(true);
    expect(state.error).toBeNull();
  });

  it('stores both tokens and the user on success', () => {
    const token = fakeJwt();
    const state = reduce(AuthActions.login({ returnUrl: null }), succeeded(token));

    expect(state).toEqual({ token, idToken: 'id-token', user: fakeUser(), pending: false, error: null });
  });

  it('keeps the error of a failed sign-in', () => {
    const failed = reduce(AuthActions.exchangeCode({ code: 'c', state: 's' }), AuthActions.signInFailed({ error: 'Expired' }));

    expect(failed.pending).toBe(false);
    expect(failed.error).toBe('Expired');
  });

  it('restores tokens and later the user', () => {
    const token = fakeJwt();
    const state = reduce(AuthActions.restored({ token, idToken: 'id' }), AuthActions.userLoaded({ user: fakeUser() }));

    expect(state.token).toBe(token);
    expect(state.idToken).toBe('id');
    expect(state.user?.email).toBe('dana@example.com');
  });

  it('keeps the tokens on logout until the effect has used the ID token, then forgets everything', () => {
    const signedIn = reduce(succeeded());

    expect(authFeature.reducer(signedIn, AuthActions.logout())).toBe(signedIn);
    expect(authFeature.reducer(signedIn, AuthActions.loggedOut())).toEqual(initialAuthState);
    expect(authFeature.reducer(signedIn, AuthActions.sessionExpired())).toEqual(initialAuthState);
  });
});

describe('auth selectors', () => {
  const state = (token: string | null, user = fakeUser()) => ({ auth: { ...initialAuthState, token, user } });

  it('derives login state and role from the access token', () => {
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
