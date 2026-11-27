import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { User } from '../models';
import { Registration } from './auth.models';

/**
 * Everything that can happen to the session. Components and the interceptor only dispatch these;
 * AuthEffects does the HTTP calls, storage and navigation.
 * (Passwords in these actions are masked in Redux DevTools, see auth.devtools.ts.)
 */
export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    // Started by the auth pages
    Login: props<{ email: string; password: string; returnUrl: string | null }>(),
    Register: props<{ registration: Registration; returnUrl: string | null }>(),
    'Exchange Code': props<{ code: string }>(), // after Google/Facebook: one-time code -> JWT
    'Clear Error': emptyProps(),

    // Results of the three above
    'Sign In Succeeded': props<{ token: string; user: User; returnUrl: string | null }>(),
    'Sign In Failed': props<{ error: string }>(),

    // Startup: the token saved in sessionStorage (null if none or expired)
    Restored: props<{ token: string | null }>(),

    // (Re)load the user record, e.g. after a reload or on the profile page
    'Load User': emptyProps(),
    'User Loaded': props<{ user: User }>(),

    Logout: emptyProps(),
    /** The server answered 401, or the token's exp time has passed. */
    'Session Expired': emptyProps(),
  },
});
