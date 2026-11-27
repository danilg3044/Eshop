import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { User } from '../models';

/**
 * Everything that can happen to the session. Components and the interceptor only dispatch these;
 * AuthEffects talks to the auth server, storage and the router.
 * (Tokens and codes in these actions are masked in Redux DevTools, see auth.devtools.ts.)
 */
export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    /** Go to the auth server's sign-in page (Authorization Code + PKCE). */
    Login: props<{ returnUrl: string | null }>(),
    /** Back from the auth server at /auth/callback: trade the code for tokens. */
    'Exchange Code': props<{ code: string; state: string }>(),

    'Sign In Succeeded': props<{ token: string; idToken: string; user: User; returnUrl: string | null }>(),
    'Sign In Failed': props<{ error: string }>(),

    // Startup: the tokens saved in sessionStorage (null if none or expired)
    Restored: props<{ token: string | null; idToken: string | null }>(),

    // (Re)load the shop's user record, e.g. after a reload or on the profile page
    'Load User': emptyProps(),
    'User Loaded': props<{ user: User }>(),

    /** The user clicked "Sign out": ends the session here and at the auth server. */
    Logout: emptyProps(),
    'Logged Out': emptyProps(),
    /** The server answered 401, or the token's exp time has passed. */
    'Session Expired': emptyProps(),
  },
});
