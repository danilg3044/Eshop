export interface CartLine {
  productId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  /** Stock when the product was added; the server re-checks when the order is placed. */
  stock: number;
}

export interface CartState {
  lines: CartLine[];
}
