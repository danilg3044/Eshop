import { Action } from '@ngrx/store';
import { AuthActions } from './auth.actions';

/**
 * Redux DevTools records every action. Mask passwords so they never show up in the action log
 * (wired in app.config.ts via provideStoreDevtools({ actionSanitizer })).
 */
export function maskSecrets(action: Action): Action {
  if (action.type === AuthActions.login.type) {
    return { ...action, password: '***' } as Action;
  }
  if (action.type === AuthActions.register.type) {
    const register = action as ReturnType<typeof AuthActions.register>;
    return { ...register, registration: { ...register.registration, password: '***' } } as Action;
  }
  return action;
}
