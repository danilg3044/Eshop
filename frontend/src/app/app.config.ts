import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { routes } from './app.routes';
import { maskSecrets } from './core/auth/auth.devtools';
import { AuthEffects } from './core/auth/auth.effects';
import { authInterceptor } from './core/auth/auth.interceptor';
import { authFeature } from './core/auth/auth.reducer';
import { CartEffects } from './core/cart/cart.effects';
import { cartFeature } from './core/cart/cart.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: route params (":id") and query params arrive as component input()s
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    // NgRx: one global store; each feature registers its slice (state.auth, state.cart) and its effects.
    provideStore(),
    provideState(authFeature),
    provideState(cartFeature),
    provideEffects(AuthEffects, CartEffects),
    // Redux DevTools browser extension: action log, state diff, time travel. Dev builds only; passwords masked.
    provideStoreDevtools({ maxAge: 50, logOnly: !isDevMode(), actionSanitizer: maskSecrets }),
  ],
};
