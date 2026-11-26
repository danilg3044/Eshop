import { Routes } from '@angular/router';
import { AdminLayout } from './admin-layout';

/** Lazy-loaded back office. The parent route in app.routes.ts applies adminGuard. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'orders' },
      { path: 'orders', title: 'Orders · Admin', loadComponent: () => import('./admin-orders').then((m) => m.AdminOrders) },
      { path: 'products', title: 'Products · Admin', loadComponent: () => import('./admin-products').then((m) => m.AdminProducts) },
      { path: 'users', title: 'Users · Admin', loadComponent: () => import('./admin-users').then((m) => m.AdminUsers) },
      { path: 'users/:id', title: 'User · Admin', loadComponent: () => import('./admin-user-detail').then((m) => m.AdminUserDetail) },
      { path: 'profile', title: 'Profile · Admin', loadComponent: () => import('../shared/profile-page').then((m) => m.ProfilePage) },
    ],
  },
];
