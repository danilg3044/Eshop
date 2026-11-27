import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { map, tap } from 'rxjs';
import { CartActions } from './cart.actions';
import { CartLine } from './cart.models';
import { selectCartLines } from './cart.selectors';

export const CART_STORAGE_KEY = 'eshop.cart';

/**
 * Side effects of the cart: the browser's localStorage.
 * Effects are RxJS pipelines over the stream of every dispatched action.
 */
@Injectable()
export class CartEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  /** At startup: read the saved cart and put it into the store. */
  readonly restore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      map(() => CartActions.restored({ lines: loadLines() })),
    ),
  );

  /** After every change: write the (already reduced) lines back. Dispatches nothing. */
  readonly persist$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(CartActions.addProduct, CartActions.setQuantity, CartActions.removeLine, CartActions.clear),
        concatLatestFrom(() => this.store.select(selectCartLines)),
        tap(([, lines]) => saveLines(lines)),
      ),
    { dispatch: false },
  );
}

function loadLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function saveLines(lines: CartLine[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // storage unavailable: the cart just won't survive a reload
  }
}
