import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { firstValueFrom, NEVER, Observable, of, Subject, throwError, toArray } from 'rxjs';
import { vi } from 'vitest';
import { fakeJwt } from '../../testing/fake-jwt';
import { fakeUser } from '../../testing/fake-user';
import { AuthActions } from './auth.actions';
import { AuthApi } from './auth-api';
import { AuthEffects, TOKEN_STORAGE_KEY } from './auth.effects';

/** Effects are tested without HTTP: AuthApi and Router are fakes, actions$ is whatever the test feeds in. */
describe('AuthEffects', () => {
  let actions$: Observable<Action>;
  let effects: AuthEffects;
  let api: { [K in 'login' | 'register' | 'exchangeCode' | 'me']: ReturnType<typeof vi.fn> };
  let router: { url: string; navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };

  const tokenResponse = (token: string) => of({ accessToken: token, expiresAt: '2030-01-01T00:00:00Z' });

  beforeEach(() => {
    sessionStorage.clear();
    api = { login: vi.fn(), register: vi.fn(), exchangeCode: vi.fn(), me: vi.fn() };
    router = { url: '/orders', navigate: vi.fn(), navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        { provide: AuthApi, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
    effects = TestBed.inject(AuthEffects);
  });

  afterEach(() => vi.useRealTimers());

  describe('sign in', () => {
    it('logs in, loads the user with the new token and reports success', async () => {
      const token = fakeJwt();
      api.login.mockReturnValue(tokenResponse(token));
      api.me.mockReturnValue(of(fakeUser()));
      actions$ = of(AuthActions.login({ email: 'dana@example.com', password: 'pw', returnUrl: '/checkout' }));

      expect(await firstValueFrom(effects.login$)).toEqual(
        AuthActions.signInSucceeded({ token, user: fakeUser(), returnUrl: '/checkout' }),
      );
      expect(api.login).toHaveBeenCalledWith('dana@example.com', 'pw');
      expect(api.me).toHaveBeenCalledWith(token);
    });

    it("reports the server's message when sign-in fails", async () => {
      api.login.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 401, error: { detail: 'Invalid email or password' } })),
      );
      actions$ = of(AuthActions.login({ email: 'a@b.c', password: 'wrong', returnUrl: null }));

      expect(await firstValueFrom(effects.login$)).toEqual(AuthActions.signInFailed({ error: 'Invalid email or password' }));
    });

    it('ignores a second login while the first is still running (exhaustMap)', () => {
      api.login.mockReturnValue(NEVER);
      const login = AuthActions.login({ email: 'a@b.c', password: 'pw', returnUrl: null });
      actions$ = of(login, login);

      effects.login$.subscribe();

      expect(api.login).toHaveBeenCalledTimes(1);
    });

    it('registers and exchanges social-login codes the same way', async () => {
      const token = fakeJwt();
      api.register.mockReturnValue(tokenResponse(token));
      api.exchangeCode.mockReturnValue(tokenResponse(token));
      api.me.mockReturnValue(of(fakeUser()));
      const registration = { email: 'e@x.com', password: 'Secret123!', firstName: 'E', lastName: 'X' };

      actions$ = of(AuthActions.register({ registration, returnUrl: null }));
      expect((await firstValueFrom(effects.register$)).type).toBe(AuthActions.signInSucceeded.type);

      actions$ = of(AuthActions.exchangeCode({ code: 'abc' }));
      expect((await firstValueFrom(effects.exchangeCode$)).type).toBe(AuthActions.signInSucceeded.type);
      expect(api.exchangeCode).toHaveBeenCalledWith('abc');
    });

    it('goes to the return URL, or to the area that fits the role', () => {
      actions$ = of(
        AuthActions.signInSucceeded({ token: 't', user: fakeUser('USER'), returnUrl: '/checkout' }),
        AuthActions.signInSucceeded({ token: 't', user: fakeUser('ADMIN'), returnUrl: null }),
        AuthActions.signInSucceeded({ token: 't', user: fakeUser('USER'), returnUrl: null }),
      );
      effects.navigateAfterSignIn$.subscribe();

      expect(router.navigateByUrl.mock.calls.map((c) => c[0])).toEqual(['/checkout', '/admin', '/']);
    });
  });

  describe('session', () => {
    it('restores a valid saved token and drops an expired one', async () => {
      const token = fakeJwt();
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      actions$ = of({ type: ROOT_EFFECTS_INIT });
      expect(await firstValueFrom(effects.restore$)).toEqual(AuthActions.restored({ token }));

      sessionStorage.setItem(TOKEN_STORAGE_KEY, fakeJwt({ expiresInSec: -10 }));
      expect(await firstValueFrom(effects.restore$)).toEqual(AuthActions.restored({ token: null }));
    });

    it('loads the user after restoring a token, but not when there is none', async () => {
      actions$ = of(AuthActions.restored({ token: null }), AuthActions.restored({ token: fakeJwt() }));

      expect(await firstValueFrom(effects.loadUserAfterRestore$.pipe(toArray()))).toEqual([AuthActions.loadUser()]);
    });

    it('saves the token on sign-in and removes it on logout', () => {
      const token = fakeJwt();
      const actions = new Subject<Action>();
      actions$ = actions;
      effects.persistToken$.subscribe();

      actions.next(AuthActions.signInSucceeded({ token, user: fakeUser(), returnUrl: null }));
      expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe(token);

      actions.next(AuthActions.logout());
      expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });

    it('expires the session when the token does, and cancels the timer on logout', () => {
      vi.useFakeTimers();
      const actions = new Subject<Action>();
      actions$ = actions;
      const emitted: Action[] = [];
      effects.expireSession$.subscribe((a) => emitted.push(a));

      actions.next(AuthActions.restored({ token: fakeJwt({ expiresInSec: 60 }) }));
      vi.advanceTimersByTime(59_000);
      expect(emitted).toEqual([]);
      vi.advanceTimersByTime(2_000);
      expect(emitted).toEqual([AuthActions.sessionExpired()]);

      actions.next(AuthActions.restored({ token: fakeJwt({ expiresInSec: 60 }) }));
      actions.next(AuthActions.logout());
      vi.advanceTimersByTime(120_000);
      expect(emitted).toHaveLength(1);
    });

    it('sends the user to the login page with a way back after the session expired', () => {
      actions$ = of(AuthActions.sessionExpired());
      effects.navigateAfterSessionExpired$.subscribe();

      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/orders' } });
    });

    it('goes to the shop home after logout', () => {
      actions$ = of(AuthActions.logout());
      effects.navigateAfterLogout$.subscribe();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });
  });
});
