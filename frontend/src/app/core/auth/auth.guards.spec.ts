import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { fakeJwt } from '../../testing/fake-jwt';
import { Role } from '../models';
import { adminGuard, authGuard } from './auth.guards';
import { initialAuthState } from './auth.reducer';

describe('route guards', () => {
  /** Guards only read the store, so a MockStore with the right state is all they need. */
  function run(guard: typeof authGuard, role: Role | null, url = '/admin/orders') {
    const token = role ? fakeJwt({ role }) : null;
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideMockStore({ initialState: { auth: { ...initialAuthState, token } } })],
    });
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  const target = (result: unknown) => (result as UrlTree).toString();

  it('authGuard sends visitors to login with a return URL', () => {
    expect(target(run(authGuard, null, '/checkout'))).toBe('/login?returnUrl=%2Fcheckout');
  });

  it('authGuard lets signed-in users through', () => {
    expect(run(authGuard, 'USER')).toBe(true);
  });

  it('adminGuard lets admins through', () => {
    expect(run(adminGuard, 'ADMIN')).toBe(true);
  });

  it('adminGuard sends customers back to the shop', () => {
    expect(target(run(adminGuard, 'USER'))).toBe('/');
  });

  it('adminGuard sends visitors to the admin login', () => {
    expect(target(run(adminGuard, null))).toBe('/login?returnUrl=%2Fadmin%2Forders');
  });
});
