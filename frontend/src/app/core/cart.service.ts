import { Service, computed, effect, signal } from '@angular/core';
import { Product } from './models';

export interface CartLine {
  productId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  /** Stock when the product was added; the server re-checks when the order is placed. */
  stock: number;
}

const CART_KEY = 'eshop.cart';

/** Shopping cart kept in the browser (localStorage), so it survives reloads and doesn't need a login. */
@Service()
export class CartService {
  private readonly linesState = signal<CartLine[]>(CartService.restore());

  readonly lines = this.linesState.asReadonly();
  readonly count = computed(() => this.linesState().reduce((n, l) => n + l.quantity, 0));
  readonly total = computed(() =>
    // round to cents to avoid floating point noise like 59.900000000000006
    Math.round(this.linesState().reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100,
  );
  readonly isEmpty = computed(() => this.linesState().length === 0);

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(this.linesState()));
      } catch {
        // storage unavailable: the cart just won't survive a reload
      }
    });
  }

  add(product: Product, quantity = 1): void {
    this.linesState.update((lines) => {
      const existing = lines.find((l) => l.productId === product.id);
      if (existing) {
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
    });
  }

  setQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    this.linesState.update((lines) =>
      lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(quantity, l.stock) } : l)),
    );
  }

  remove(productId: number): void {
    this.linesState.update((lines) => lines.filter((l) => l.productId !== productId));
  }

  clear(): void {
    this.linesState.set([]);
  }

  private static restore(): CartLine[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? (JSON.parse(raw) as CartLine[]) : [];
    } catch {
      return [];
    }
  }
}
