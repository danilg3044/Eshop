import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth/auth.guards';
import { ShopLayout } from './features/shop/shop-layout/shop-layout';

export const routes: Routes = [
  // Customer storefront
  {
    path: '',
    component: ShopLayout,
    children: [
      { path: '', title: 'EShop', loadComponent: () => import('./features/shop/catalog/catalog').then((m) => m.Catalog) },
      {
        path: 'products/:id',
        title: 'Product · EShop',
        loadComponent: () => import('./features/shop/product-detail/product-detail').then((m) => m.ProductDetail),
      },
      { path: 'cart', title: 'Cart · EShop', loadComponent: () => import('./features/shop/cart/cart').then((m) => m.Cart) },
      {
        path: 'checkout',
        title: 'Checkout · EShop',
        canActivate: [authGuard],
        loadComponent: () => import('./features/shop/checkout/checkout').then((m) => m.Checkout),
      },
      {
        path: 'orders',
        title: 'My orders · EShop',
        canActivate: [authGuard],
        loadComponent: () => import('./features/shop/my-orders/my-orders').then((m) => m.MyOrders),
      },
      {
        path: 'profile',
        title: 'Profile · EShop',
        canActivate: [authGuard],
        loadComponent: () => import('./features/shared/profile-page/profile-page').then((m) => m.ProfilePage),
      },
      { path: 'login', title: 'Sign in · EShop', loadComponent: () => import('./features/auth/login/login').then((m) => m.Login) },
      // Registration is a page of cloud/auth-server now (linked from its sign-in page).
      { path: 'register', redirectTo: 'login' },
      {
        path: 'auth/callback',
        title: 'Signing in · EShop',
        loadComponent: () => import('./features/auth/oauth-callback/oauth-callback').then((m) => m.OAuthCallback),
      },
    ],
  },
  // Back office: its own layout, lazy-loaded, admins only
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
