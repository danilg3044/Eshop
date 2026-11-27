import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { AuthApi } from './auth-api';
import { AuthActions } from './auth.actions';
import { maskSecrets } from './auth.devtools';

describe('AuthApi', () => {
  let api: AuthApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AuthApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts credentials to the login endpoint', () => {
    api.login('dana@example.com', 'secret').subscribe();

    expect(http.expectOne('/api/auth/login').request.body).toEqual({ email: 'dana@example.com', password: 'secret' });
  });

  it('loads the user with a token that is not in the store yet', () => {
    api.me('abc').subscribe();

    expect(http.expectOne('/api/auth/me').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('builds the backend URL that starts a social login', () => {
    expect(api.socialLoginUrl('google')).toBe('http://localhost:8080/oauth2/authorization/google');
  });
});

describe('maskSecrets (Redux DevTools)', () => {
  it('hides passwords in login and register actions and leaves others alone', () => {
    const login = maskSecrets(AuthActions.login({ email: 'a@b.c', password: 'secret', returnUrl: null }));
    const register = maskSecrets(
      AuthActions.register({ registration: { email: 'a@b.c', password: 'secret', firstName: 'A', lastName: 'B' }, returnUrl: null }),
    );
    const other: Action = AuthActions.logout();

    expect(JSON.stringify([login, register])).not.toContain('secret');
    expect(maskSecrets(other)).toBe(other);
  });
});
