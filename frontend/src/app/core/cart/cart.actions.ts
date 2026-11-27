import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Product } from '../models';
import { CartLine } from './cart.models';

/**
 * Everything that can happen to the cart. Components only dispatch these; they never change state themselves.
 * createActionGroup turns 'Add Product' into CartActions.addProduct with type "[Cart] Add Product"
 * (that type string is what Redux DevTools shows).
 */
export const CartActions = createActionGroup({
  source: 'Cart',
  events: {
    'Add Product': props<{ product: Product; quantity: number }>(),
    'Set Quantity': props<{ productId: number; quantity: number }>(),
    'Remove Line': props<{ productId: number }>(),
    Clear: emptyProps(),
    /** Dispatched once at startup by CartEffects with the lines saved in localStorage. */
    Restored: props<{ lines: CartLine[] }>(),
  },
});
