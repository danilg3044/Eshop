import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { fakeUser } from '../../testing/fake-user';
import { AuthApi } from './auth-api';
import { AuthActions } from './auth.actions';
import { maskSecrets, maskTokensInState } from './auth.devtools';
import { initialAuthState } from './auth.reducer';

describe('AuthApi', () => {
  let api: AuthApi;
  let http: HttpTestingController;
  const origin = window.location.origin; // the test page's origin stands in for http://localhost:4200

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AuthApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('builds an Authorization Code + PKCE request to the auth server', () => {
    const url = new URL(api.authorizeUrl({ verifier: 'v', challenge: 'the-challenge', state: 'the-state' }));

    expect(url.origin + url.pathname).toBe('http://localhost:9000/oauth2/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'eshop-web',
      redirect_uri: `${origin}/auth/callback`,
      scope: 'openid profile email',
      state: 'the-state',
      code_challenge: 'the-challenge',
      code_challenge_method: 'S256',
    });
  });

  it('exchanges code + verifier at the token endpoint as a form post, without a client secret', () => {
    api.exchangeCode('the-code', 'the-verifier').subscribe();

    const req = http.expectOne('http://localhost:9000/oauth2/token');
    expect(req.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(new URLSearchParams(req.request.body as string))).toEqual({
      grant_type: 'authorization_code',
      code: 'the-code',
      redirect_uri: `${origin}/auth/callback`,
      client_id: 'eshop-web',
      code_verifier: 'the-verifier',
    });
  });

  it('loads the shop user with a token that is not in the store yet', () => {
    api.me('abc').subscribe();

    expect(http.expectOne('/api/auth/me').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('signs out at the auth server with the ID token and comes back to the shop', () => {
    const url = new URL(api.logoutUrl('the-id-token'));

    expect(url.pathname).toBe('/connect/logout');
    expect(url.searchParams.get('id_token_hint')).toBe('the-id-token');
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(`${origin}/`);
  });

  it('follows <base href> when the app is served under a path, e.g. /eshop/ by the backend', () => {
    const base = document.createElement('base');
    base.href = '/eshop/';
    document.head.prepend(base);
    try {
      expect(api.redirectUri()).toBe(`${origin}/eshop/auth/callback`);
      expect(new URL(api.logoutUrl('t')).searchParams.get('post_logout_redirect_uri')).toBe(`${origin}/eshop/`);
    } finally {
      base.remove();
    }
  });
});

describe('Redux DevTools masking', () => {
  it('hides tokens and codes in actions and leaves others alone', () => {
    const masked = [
      maskSecrets(AuthActions.signInSucceeded({ token: 'secret-at', idToken: 'secret-id', user: fakeUser(), returnUrl: null })),
      maskSecrets(AuthActions.restored({ token: 'secret-at', idToken: 'secret-id' })),
      maskSecrets(AuthActions.exchangeCode({ code: 'secret-code', state: 's' })),
    ];
    const other: Action = AuthActions.logout();

    expect(JSON.stringify(masked)).not.toContain('secret');
    expect(maskSecrets(other)).toBe(other);
  });

  it('hides the tokens in the state', () => {
    const state = { auth: { ...initialAuthState, token: 'secret-at', idToken: 'secret-id' }, cart: { lines: [] } };

    expect(JSON.stringify(maskTokensInState(state))).not.toContain('secret');
    expect(maskTokensInState(state).cart).toBe(state.cart);
  });
});
