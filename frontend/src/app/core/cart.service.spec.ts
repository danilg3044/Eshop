import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { Product } from './models';

const product = (id: number, price: number, stock = 10): Product => ({
  id, sku: `SKU-${id}`, name: `Product ${id}`, description: null, category: 'Test', price, stock, imageUrl: null, active: true,
});

describe('CartService', () => {
  let cart: CartService;

  beforeEach(() => {
    localStorage.clear();
    cart = TestBed.inject(CartService);
  });

  it('adds products and computes count and total', () => {
    cart.add(product(1, 19.9));
    cart.add(product(2, 10), 3);

    expect(cart.count()).toBe(4);
    expect(cart.total()).toBe(49.9);
  });

  it('merges repeated adds of the same product', () => {
    cart.add(product(1, 5));
    cart.add(product(1, 5), 2);

    expect(cart.lines()).toHaveLength(1);
    expect(cart.lines()[0].quantity).toBe(3);
  });

  it('never exceeds available stock', () => {
    cart.add(product(1, 5, 2), 5);
    expect(cart.lines()[0].quantity).toBe(2);

    cart.setQuantity(1, 10);
    expect(cart.lines()[0].quantity).toBe(2);
  });

  it('removes a line when quantity drops to zero', () => {
    cart.add(product(1, 5));
    cart.setQuantity(1, 0);

    expect(cart.isEmpty()).toBe(true);
  });

  it('persists to localStorage', () => {
    cart.add(product(7, 1));
    TestBed.tick(); // run the effect that saves the cart

    expect(JSON.parse(localStorage.getItem('eshop.cart')!)[0].productId).toBe(7);
  });
});
