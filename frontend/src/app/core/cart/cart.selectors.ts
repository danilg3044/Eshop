import { createSelector } from '@ngrx/store';
import { cartFeature } from './cart.reducer';

/** createFeature generates a selector per state property; derived values are built on top with createSelector (memoized). */
export const selectCartLines = cartFeature.selectLines;

export const selectCartCount = createSelector(selectCartLines, (lines) => lines.reduce((n, l) => n + l.quantity, 0));

export const selectCartTotal = createSelector(
  selectCartLines,
  // round to cents to avoid floating point noise like 59.900000000000006
  (lines) => Math.round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100,
);

export const selectCartIsEmpty = createSelector(selectCartLines, (lines) => lines.length === 0);

/** What the order API needs: just product ids and quantities. */
export const selectOrderItems = createSelector(selectCartLines, (lines) =>
  lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
);
