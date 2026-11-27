import { Action } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { AuthState } from './auth.models';

const HIDDEN = '***';

/**
 * Redux DevTools records every action and state. Mask tokens and authorization codes so they never show up
 * there (wired in app.config.ts via provideStoreDevtools({ actionSanitizer, stateSanitizer })).
 */
export function maskSecrets(action: Action): Action {
  switch (action.type) {
    case AuthActions.signInSucceeded.type:
    case AuthActions.restored.type:
      return { ...action, token: HIDDEN, idToken: HIDDEN } as Action;
    case AuthActions.exchangeCode.type:
      return { ...action, code: HIDDEN } as Action;
    default:
      return action;
  }
}

export function maskTokensInState<S>(state: S): S {
  const auth = (state as { auth?: AuthState }).auth;
  if (!auth?.token) {
    return state;
  }
  return { ...state, auth: { ...auth, token: HIDDEN, idToken: HIDDEN } };
}
