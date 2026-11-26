// TypeScript mirrors of the backend DTOs (backend/src/main/java/com/example/eshop/**/*Dto.java).

export type Role = 'USER' | 'ADMIN';
export type AuthProvider = 'LOCAL' | 'GOOGLE' | 'FACEBOOK';
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type OrderScope = 'CURRENT' | 'HISTORY' | 'ALL';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  active: boolean;
}

export interface Profile {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface User {
  id: number;
  email: string;
  role: Role;
  provider: AuthProvider;
  enabled: boolean;
  createdAt: string;
  profile: Profile;
}

export interface ShippingAddress {
  name: string;
  addressLine: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  userId: number;
  userEmail: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
  shipping: ShippingAddress;
  items: OrderItem[];
}

export interface TokenResponse {
  accessToken: string;
  expiresAt: string;
}

export interface UserSummary {
  user: User;
  orderCount: number;
}

export interface UserDetail {
  user: User;
  orders: Order[];
}

/** Which status an admin may move an order to next (mirrors OrderStatus.canTransitionTo in the backend). */
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};
