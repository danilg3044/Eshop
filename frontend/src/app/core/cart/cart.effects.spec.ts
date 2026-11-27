import { TestBed } from '@angular/core/testing';
import { Action } from '@ngrx/store';
import { provideMockActions } from '@ngrx/effects/testing';
import { ROOT_EFFECTS_INIT } from '@ngrx/effects';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { firstValueFrom, Observable, of } from 'rxjs';
import { CartActions } from './cart.actions';
import { CartEffects, CART_STORAGE_KEY } from './cart.effects';
import { CartLine } from './cart.models';
import { selectCartLines } from './cart.selectors';

const line = (productId: number, quantity = 1): CartLine => ({
  productId, name: `Product ${productId}`, price: 5, imageUrl: null, quantity, stock: 10,
});

describe('CartEffects', () => {
  let actions$: Observable<Action>;
  let effects: CartEffects;
  let store: MockStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [CartEffects, provideMockActions(() => actions$), provideMockStore()],
    });
    effects = TestBed.inject(CartEffects);
    store = TestBed.inject(MockStore);
  });

  it('restores the saved cart at startup', async () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([line(3, 2)]));
    actions$ = of({ type: ROOT_EFFECTS_INIT });

    expect(await firstValueFrom(effects.restore$)).toEqual(CartActions.restored({ lines: [line(3, 2)] }));
  });

  it('restores an empty cart when storage holds garbage', async () => {
    localStorage.setItem(CART_STORAGE_KEY, '{not json');
    actions$ = of({ type: ROOT_EFFECTS_INIT });

    expect(await firstValueFrom(effects.restore$)).toEqual(CartActions.restored({ lines: [] }));
  });

  it('saves the current lines after a cart change', async () => {
    store.overrideSelector(selectCartLines, [line(7)]);
    actions$ = of(CartActions.removeLine({ productId: 1 }));

    await firstValueFrom(effects.persist$);

    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([line(7)]);
  });

  it('does not save on restore (nothing changed)', async () => {
    actions$ = of(CartActions.restored({ lines: [line(1)] }));
    const emitted: unknown[] = [];

    effects.persist$.subscribe((v) => emitted.push(v));

    expect(emitted).toEqual([]);
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
  });
});
