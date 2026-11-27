import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { fakeJwt } from '../../testing/fake-jwt';
import { AuthActions } from './auth.actions';
import { authInterceptor } from './auth.interceptor';
import { initialAuthState } from './auth.reducer';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let store: MockStore;

  function setup(token: string | null) {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState: { auth: { ...initialAuthState, token } } }),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
  }

  afterEach(() => httpMock.verify());

  it('adds the stored bearer token to API calls', () => {
    const token = fakeJwt();
    setup(token);

    http.get('/api/orders/mine').subscribe();

    expect(httpMock.expectOne('/api/orders/mine').request.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('keeps an Authorization header the request already has', () => {
    setup(fakeJwt());

    http.get('/api/auth/me', { headers: { Authorization: 'Bearer explicit' } }).subscribe();

    expect(httpMock.expectOne('/api/auth/me').request.headers.get('Authorization')).toBe('Bearer explicit');
  });

  it('never sends the token to other hosts, such as the auth server', () => {
    setup(fakeJwt());

    http.post('http://localhost:9000/oauth2/token', '').subscribe();

    expect(httpMock.expectOne('http://localhost:9000/oauth2/token').request.headers.has('Authorization')).toBe(false);
  });

  it('reports a 401 on an authenticated call as an expired session', () => {
    setup(fakeJwt());

    http.get('/api/profile').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/profile').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(store.dispatch).toHaveBeenCalledWith(AuthActions.sessionExpired());
  });
});
