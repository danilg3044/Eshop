import { createFeature, createReducer, on } from '@ngrx/store';
import { Product } from '../models';
import { CartActions } from './cart.actions';
import { CartLine, CartState } from './cart.models';

export const initialCartState: CartState = { lines: [] };

/**
 * The reducer is a pure function (state, action) => new state: no HTTP, no localStorage, no mutation.
 * Side effects live in CartEffects.
 */
export const cartFeature = createFeature({
  name: 'cart',
  reducer: createReducer(
    initialCartState,
    on(CartActions.addProduct, (state, { product, quantity }) => ({
      ...state,
      lines: addLine(state.lines, product, quantity),
    })),
    on(CartActions.setQuantity, (state, { productId, quantity }) => ({
      ...state,
      lines:
        quantity <= 0
          ? state.lines.filter((l) => l.productId !== productId)
          : state.lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(quantity, l.stock) } : l)),
    })),
    on(CartActions.removeLine, (state, { productId }) => ({
      ...state,
      lines: state.lines.filter((l) => l.productId !== productId),
    })),
    on(CartActions.clear, () => initialCartState),
    on(CartActions.restored, (state, { lines }) => ({ ...state, lines })),
  ),
});

function addLine(lines: CartLine[], product: Product, quantity: number): CartLine[] {
  if (lines.some((l) => l.productId === product.id)) {
    return lines.map((l) =>
      l.productId === product.id ? { ...l, quantity: Math.min(l.quantity + quantity, product.stock) } : l,
    );
  }
  const line: CartLine = {
    productId: product.id,
    name: product.name,
    price: product.price,
    imageUrl: product.imageUrl,
    quantity: Math.min(quantity, product.stock),
    stock: product.stock,
  };
  return [...lines, line];
}
