import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { fakeJwt } from '../testing/fake-jwt';
import { AuthService } from './auth.service';
import { User } from './models';

const user = (role: 'USER' | 'ADMIN' = 'USER'): User => ({
  id: 1, email: 'dana@example.com', role, provider: 'LOCAL', enabled: true, createdAt: '2026-01-01T00:00:00Z',
  profile: { firstName: 'Dana', lastName: 'Cohen', phone: null, addressLine: null, city: null, postalCode: null, country: null },
});

describe('AuthService', () => {
  let http: HttpTestingController;

  function create(): AuthService {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => http.verify());

  it('logs in: stores the token, then loads the user', () => {
    const auth = create();
    const token = fakeJwt({ role: 'USER' });
    let loaded: User | undefined;

    auth.login('dana@example.com', 'secret123').subscribe((u) => (loaded = u));
    const login = http.expectOne('/api/auth/login');
    expect(login.request.body).toEqual({ email: 'dana@example.com', password: 'secret123' });
    login.flush({ accessToken: token, expiresAt: '2030-01-01T00:00:00Z' });
    http.expectOne('/api/auth/me').flush(user());

    expect(loaded?.email).toBe('dana@example.com');
    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.isAdmin()).toBe(false);
    expect(sessionStorage.getItem('eshop.token')).toBe(token);
  });

  it('reads the role from the token', () => {
    sessionStorage.setItem('eshop.token', fakeJwt({ role: 'ADMIN' }));
    const auth = create();

    expect(auth.isAdmin()).toBe(true);
  });

  it('ignores an expired token left in storage', () => {
    sessionStorage.setItem('eshop.token', fakeJwt({ expiresInSec: -10 }));
    const auth = create();

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.token()).toBeNull();
  });

  it('logout clears everything', () => {
    sessionStorage.setItem('eshop.token', fakeJwt());
    const auth = create();

    auth.logout();

    expect(auth.isLoggedIn()).toBe(false);
    expect(sessionStorage.getItem('eshop.token')).toBeNull();
  });

  it('exchanges a social-login code for a token', () => {
    const auth = create();

    auth.exchangeCode('abc').subscribe();
    const req = http.expectOne('/api/auth/exchange');
    expect(req.request.body).toEqual({ code: 'abc' });
    req.flush({ accessToken: fakeJwt(), expiresAt: '2030-01-01T00:00:00Z' });
    http.expectOne('/api/auth/me').flush(user());

    expect(auth.isLoggedIn()).toBe(true);
  });

  it('builds the backend URL that starts a social login', () => {
    expect(create().socialLoginUrl('google')).toBe('http://localhost:8080/oauth2/authorization/google');
  });
});
