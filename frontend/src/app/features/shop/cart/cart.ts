import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { CartActions } from '../../../core/cart/cart.actions';
import { selectCartIsEmpty, selectCartLines, selectCartTotal } from '../../../core/cart/cart.selectors';

@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  private readonly store = inject(Store);

  // Read: selectors as signals. Write: dispatch actions; the reducer computes the new state.
  protected readonly lines = this.store.selectSignal(selectCartLines);
  protected readonly total = this.store.selectSignal(selectCartTotal);
  protected readonly isEmpty = this.store.selectSignal(selectCartIsEmpty);

  protected setQuantity(productId: number, quantity: number): void {
    this.store.dispatch(CartActions.setQuantity({ productId, quantity }));
  }

  protected remove(productId: number): void {
    this.store.dispatch(CartActions.removeLine({ productId }));
  }
}
