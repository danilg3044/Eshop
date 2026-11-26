import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { fakeJwt } from '../testing/fake-jwt';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  function setup(token: string | null) {
    sessionStorage.clear();
    if (token) {
      sessionStorage.setItem('eshop.token', token);
    }
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpMock.verify());

  it('adds the bearer token to API calls', () => {
    const token = fakeJwt();
    setup(token);

    http.get('/api/orders/mine').subscribe();

    expect(httpMock.expectOne('/api/orders/mine').request.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('does not send the token to other hosts', () => {
    setup(fakeJwt());

    http.get('https://picsum.photos/x').subscribe();

    expect(httpMock.expectOne('https://picsum.photos/x').request.headers.has('Authorization')).toBe(false);
  });

  it('signs out and redirects to login when the server answers 401', () => {
    setup(fakeJwt());
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    http.get('/api/profile').subscribe({ error: () => undefined });
    httpMock.expectOne('/api/profile').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], expect.anything());
  });
});
