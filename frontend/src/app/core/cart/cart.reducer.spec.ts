import { Action } from '@ngrx/store';
import { Product } from '../models';
import { CartActions } from './cart.actions';
import { CartState } from './cart.models';
import { cartFeature, initialCartState } from './cart.reducer';
import { selectCartCount, selectCartIsEmpty, selectCartTotal, selectOrderItems } from './cart.selectors';

const product = (id: number, price: number, stock = 10): Product => ({
  id, sku: `SKU-${id}`, name: `Product ${id}`, description: null, category: 'Test', price, stock, imageUrl: null, active: true,
});

/** Reducers are pure functions: no TestBed needed, just feed actions in and check the state that comes out. */
const reduce = (...actions: Action[]): CartState => actions.reduce(cartFeature.reducer, initialCartState);
const add = (p: Product, quantity = 1) => CartActions.addProduct({ product: p, quantity });

describe('cart reducer', () => {
  it('adds products', () => {
    const state = reduce(add(product(1, 19.9)), add(product(2, 10), 3));

    expect(state.lines.map((l) => [l.productId, l.quantity])).toEqual([[1, 1], [2, 3]]);
  });

  it('merges repeated adds of the same product', () => {
    const state = reduce(add(product(1, 5)), add(product(1, 5), 2));

    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].quantity).toBe(3);
  });

  it('never exceeds available stock', () => {
    expect(reduce(add(product(1, 5, 2), 5)).lines[0].quantity).toBe(2);
    expect(reduce(add(product(1, 5, 2)), CartActions.setQuantity({ productId: 1, quantity: 10 })).lines[0].quantity).toBe(2);
  });

  it('removes a line when its quantity drops to zero, or on removeLine', () => {
    expect(reduce(add(product(1, 5)), CartActions.setQuantity({ productId: 1, quantity: 0 })).lines).toEqual([]);
    expect(reduce(add(product(1, 5)), add(product(2, 5)), CartActions.removeLine({ productId: 1 })).lines.map((l) => l.productId)).toEqual([2]);
  });

  it('clears and restores', () => {
    const restored = reduce(add(product(1, 5)), CartActions.clear(), CartActions.restored({ lines: reduce(add(product(9, 1))).lines }));

    expect(restored.lines.map((l) => l.productId)).toEqual([9]);
  });

  it('never mutates the previous state', () => {
    const before = reduce(add(product(1, 5)));
    const frozen = structuredClone(before);

    cartFeature.reducer(before, add(product(1, 5)));
    cartFeature.reducer(before, CartActions.setQuantity({ productId: 1, quantity: 4 }));

    expect(before).toEqual(frozen);
  });
});

describe('cart selectors', () => {
  // Selectors expose .projector: the pure "derive" function, testable without a store.
  const lines = reduce(add(product(1, 19.9)), add(product(2, 10), 3)).lines;

  it('computes count, total and emptiness', () => {
    expect(selectCartCount.projector(lines)).toBe(4);
    expect(selectCartTotal.projector(lines)).toBe(49.9);
    expect(selectCartIsEmpty.projector(lines)).toBe(false);
    expect(selectCartIsEmpty.projector([])).toBe(true);
  });

  it('maps lines to order items', () => {
    expect(selectOrderItems.projector(lines)).toEqual([{ productId: 1, quantity: 1 }, { productId: 2, quantity: 3 }]);
  });

  it('works on the whole app state', () => {
    expect(selectCartCount({ cart: { lines } })).toBe(4);
  });
});
