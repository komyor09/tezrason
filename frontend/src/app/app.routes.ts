import { Routes } from '@angular/router';
import { roleGuard } from './core/auth.service';

/** Маршруты приложения. Разделы ролей загружаются лениво и защищены проверкой роли. */
export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/auth').then((m) => m.LoginPage) },
  { path: 'register', loadComponent: () => import('./pages/auth').then((m) => m.RegisterPage) },

  // Клиент
  { path: '', loadComponent: () => import('./pages/client/restaurants').then((m) => m.RestaurantsPage) },
  { path: 'restaurant/:id', loadComponent: () => import('./pages/client/restaurant-menu').then((m) => m.RestaurantMenuPage) },
  { path: 'checkout', canActivate: [roleGuard('client')], loadComponent: () => import('./pages/client/checkout').then((m) => m.CheckoutPage) },
  { path: 'orders', canActivate: [roleGuard('client')], loadComponent: () => import('./pages/client/my-orders').then((m) => m.MyOrdersPage) },
  { path: 'orders/:id', canActivate: [roleGuard('client')], loadComponent: () => import('./pages/client/order-tracking').then((m) => m.OrderTrackingPage) },

  // Администратор заведения
  { path: 'manage', canActivate: [roleGuard('restaurant_admin')], loadComponent: () => import('./pages/manage/manage').then((m) => m.ManagePage) },

  // Курьер
  { path: 'courier', canActivate: [roleGuard('courier')], loadComponent: () => import('./pages/courier/courier').then((m) => m.CourierPage) },

  // Суперадминистратор
  { path: 'admin', canActivate: [roleGuard('super_admin')], loadComponent: () => import('./pages/admin/admin').then((m) => m.AdminPage) },

  { path: '**', redirectTo: '' },
];
