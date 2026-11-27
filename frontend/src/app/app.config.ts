import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { CartEffects } from './core/cart/cart.effects';
import { cartFeature } from './core/cart/cart.reducer';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: route params (":id") and query params arrive as component input()s
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    // NgRx: one global store; each feature registers its slice (state.cart, ...) and its effects.
    provideStore(),
    provideState(cartFeature),
    provideEffects(CartEffects),
    // Redux DevTools browser extension: action log, state diff, time travel. Dev builds only.
    provideStoreDevtools({ maxAge: 50, logOnly: !isDevMode() }),
  ],
};
