import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, Observable, of, Subject, throwError, toArray } from 'rxjs';
import { vi } from 'vitest';
import { fakeJwt } from '../../testing/fake-jwt';
import { fakeUser } from '../../testing/fake-user';
import { AuthActions } from './auth.actions';
import { AuthApi } from './auth-api';
import { AuthEffects, PENDING_SIGN_IN_KEY, SESSION_STORAGE_KEY } from './auth.effects';
import { initialAuthState } from './auth.reducer';

/** Effects are tested without HTTP or real redirects: AuthApi and Router are fakes, actions$ is fed by the test. */
describe('AuthEffects', () => {
  let actions$: Observable<Action>;
  let effects: AuthEffects;
  let store: MockStore;
  let api: {
    createPkce: ReturnType<typeof vi.fn>;
    authorizeUrl: ReturnType<typeof vi.fn>;
    exchangeCode: ReturnType<typeof vi.fn>;
    me: ReturnType<typeof vi.fn>;
    logoutUrl: ReturnType<typeof vi.fn>;
    redirect: ReturnType<typeof vi.fn>;
  };
  let router: { url: string; navigate: ReturnType<typeof vi.fn>; navigateByUrl: ReturnType<typeof vi.fn> };

  const pkce = { verifier: 'the-verifier', challenge: 'the-challenge', state: 'the-state' };
  const tokens = (accessToken: string) =>
    of({ access_token: accessToken, id_token: 'id-token', token_type: 'Bearer', expires_in: 3600, scope: 'openid' });
  const pendingSignIn = (returnUrl: string | null = '/checkout') =>
    sessionStorage.setItem(PENDING_SIGN_IN_KEY, JSON.stringify({ verifier: 'the-verifier', state: 'the-state', returnUrl }));

  beforeEach(() => {
    sessionStorage.clear();
    api = {
      createPkce: vi.fn().mockResolvedValue(pkce),
      authorizeUrl: vi.fn().mockReturnValue('http://localhost:9000/oauth2/authorize?...'),
      exchangeCode: vi.fn(),
      me: vi.fn(),
      logoutUrl: vi.fn().mockReturnValue('http://localhost:9000/connect/logout?...'),
      redirect: vi.fn(),
    };
    router = { url: '/orders', navigate: vi.fn(), navigateByUrl: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { auth: initialAuthState } }),
        { provide: AuthApi, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
    effects = TestBed.inject(AuthEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => vi.useRealTimers());

  describe('sign in', () => {
    it('remembers the PKCE verifier, state and return URL, then leaves for the auth server', async () => {
      actions$ = of(AuthActions.login({ returnUrl: '/checkout' }));

      await firstValueFrom(effects.login$, { defaultValue: undefined });

      expect(JSON.parse(sessionStorage.getItem(PENDING_SIGN_IN_KEY)!)).toEqual({
        verifier: 'the-verifier',
        state: 'the-state',
        returnUrl: '/checkout',
      });
      expect(api.authorizeUrl).toHaveBeenCalledWith(pkce);
      expect(api.redirect).toHaveBeenCalledWith('http://localhost:9000/oauth2/authorize?...');
    });

    it('trades code + verifier for tokens, loads the user with the new token and reports success', async () => {
      const token = fakeJwt();
      pendingSignIn('/checkout');
      api.exchangeCode.mockReturnValue(tokens(token));
      api.me.mockReturnValue(of(fakeUser()));
      actions$ = of(AuthActions.exchangeCode({ code: 'the-code', state: 'the-state' }));

      expect(await firstValueFrom(effects.exchangeCode$)).toEqual(
        AuthActions.signInSucceeded({ token, idToken: 'id-token', user: fakeUser(), returnUrl: '/checkout' }),
      );
      expect(api.exchangeCode).toHaveBeenCalledWith('the-code', 'the-verifier');
      expect(api.me).toHaveBeenCalledWith(token);
      expect(sessionStorage.getItem(PENDING_SIGN_IN_KEY)).toBeNull(); // used once
    });

    it('refuses a callback whose state this tab did not create, without sending the code anywhere', async () => {
      pendingSignIn();
      actions$ = of(AuthActions.exchangeCode({ code: 'stolen-code', state: 'other-state' }));

      expect((await firstValueFrom(effects.exchangeCode$)).type).toBe(AuthActions.signInFailed.type);
      expect(api.exchangeCode).not.toHaveBeenCalled();
    });

    it("reports the server's message when the exchange fails", async () => {
      pendingSignIn();
      api.exchangeCode.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Code expired' } })));
      actions$ = of(AuthActions.exchangeCode({ code: 'c', state: 'the-state' }));

      expect(await firstValueFrom(effects.exchangeCode$)).toEqual(AuthActions.signInFailed({ error: 'Code expired' }));
    });

    it('goes to the return URL, or to the area that fits the role', () => {
      actions$ = of(
        AuthActions.signInSucceeded({ token: 't', idToken: 'i', user: fakeUser('USER'), returnUrl: '/checkout' }),
        AuthActions.signInSucceeded({ token: 't', idToken: 'i', user: fakeUser('ADMIN'), returnUrl: null }),
        AuthActions.signInSucceeded({ token: 't', idToken: 'i', user: fakeUser('USER'), returnUrl: null }),
      );
      effects.navigateAfterSignIn$.subscribe();

      expect(router.navigateByUrl.mock.calls.map((c) => c[0])).toEqual(['/checkout', '/admin', '/']);
    });
  });

  describe('session', () => {
    it('restores valid saved tokens and drops expired ones', async () => {
      const token = fakeJwt();
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token, idToken: 'id' }));
      actions$ = of({ type: ROOT_EFFECTS_INIT });
      expect(await firstValueFrom(effects.restore$)).toEqual(AuthActions.restored({ token, idToken: 'id' }));

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: fakeJwt({ expiresInSec: -10 }), idToken: 'id' }));
      expect(await firstValueFrom(effects.restore$)).toEqual(AuthActions.restored({ token: null, idToken: null }));
    });

    it('loads the user after restoring a token, but not when there is none', async () => {
      actions$ = of(AuthActions.restored({ token: null, idToken: null }), AuthActions.restored({ token: fakeJwt(), idToken: 'i' }));

      expect(await firstValueFrom(effects.loadUserAfterRestore$.pipe(toArray()))).toEqual([AuthActions.loadUser()]);
    });

    it('saves the tokens on sign-in and removes them when the session ends', () => {
      const token = fakeJwt();
      const actions = new Subject<Action>();
      actions$ = actions;
      effects.persistSession$.subscribe();

      actions.next(AuthActions.signInSucceeded({ token, idToken: 'id', user: fakeUser(), returnUrl: null }));
      expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual({ token, idToken: 'id' });

      actions.next(AuthActions.sessionExpired());
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    });

    it('expires the session when the token does, and cancels the timer when the session ends', () => {
      vi.useFakeTimers();
      const actions = new Subject<Action>();
      actions$ = actions;
      const emitted: Action[] = [];
      effects.expireSession$.subscribe((a) => emitted.push(a));

      actions.next(AuthActions.restored({ token: fakeJwt({ expiresInSec: 60 }), idToken: 'i' }));
      vi.advanceTimersByTime(59_000);
      expect(emitted).toEqual([]);
      vi.advanceTimersByTime(2_000);
      expect(emitted).toEqual([AuthActions.sessionExpired()]);

      actions.next(AuthActions.restored({ token: fakeJwt({ expiresInSec: 60 }), idToken: 'i' }));
      actions.next(AuthActions.loggedOut());
      vi.advanceTimersByTime(120_000);
      expect(emitted).toHaveLength(1);
    });

    it('signs out at the auth server too, with the ID token', async () => {
      store.setState({ auth: { ...initialAuthState, token: fakeJwt(), idToken: 'id-token' } });
      sessionStorage.setItem(SESSION_STORAGE_KEY, '{}');
      actions$ = of(AuthActions.logout());

      expect(await firstValueFrom(effects.logout$)).toEqual(AuthActions.loggedOut());
      expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
      expect(api.logoutUrl).toHaveBeenCalledWith('id-token');
      expect(api.redirect).toHaveBeenCalledWith('http://localhost:9000/connect/logout?...');
    });

    it('sends the user through sign-in again, back to where they were, after the session expired', () => {
      actions$ = of(AuthActions.sessionExpired());
      effects.navigateAfterSessionExpired$.subscribe();

      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/orders' } });
    });
  });
});
