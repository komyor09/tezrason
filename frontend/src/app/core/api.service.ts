import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import {
  AdminRestaurant, CourierInfo, CourierProfile, Menu, Order, OrderStatus, Plan, PlatformStats, Restaurant, RestaurantStats, User,
} from './models';
import { I18nService } from './i18n.service';

/** Типизированный клиент REST API TezRason. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private toast = inject(MessageService);
  private i18n = inject(I18nService);

  // Каталог
  restaurants = (search = '') => this.http.get<Restaurant[]>('/api/restaurants', { params: search ? { search } : {} });
  menu = (id: number) => this.http.get<Menu>(`/api/restaurants/${id}/menu`);

  // Заказы клиента
  createOrder = (body: unknown) => this.http.post<Order>('/api/orders', body);
  myOrders = () => this.http.get<Order[]>('/api/orders/my');
  order = (id: number) => this.http.get<Order>(`/api/orders/${id}`);
  cancelOrder = (id: number) => this.http.post<Order>(`/api/orders/${id}/cancel`, {});
  review = (id: number, body: unknown) => this.http.post<Order>(`/api/orders/${id}/review`, body);

  // Панель заведения
  manageMenu = () => this.http.get<Menu>('/api/manage/menu');
  manageOrders = (status: string) => this.http.get<Order[]>('/api/manage/orders', { params: { status } });
  changeStatus = (id: number, status: OrderStatus, comment?: string) => this.http.post<Order>(`/api/manage/orders/${id}/status`, { status, comment });
  assignCourier = (id: number, courierId: number) => this.http.post<Order>(`/api/manage/orders/${id}/courier`, { courierId });
  availableCouriers = () => this.http.get<CourierInfo[]>('/api/manage/couriers');
  restaurantStats = () => this.http.get<RestaurantStats>('/api/manage/stats');
  addCategory = (body: unknown) => this.http.post('/api/manage/categories', body);
  addDish = (body: unknown) => this.http.post('/api/manage/dishes', body);
  updateDish = (id: number, body: unknown) => this.http.put(`/api/manage/dishes/${id}`, body);
  setAvailability = (id: number, available: boolean) => this.http.patch(`/api/manage/dishes/${id}/availability`, {}, { params: { available } });
  deleteDish = (id: number) => this.http.delete(`/api/manage/dishes/${id}`);

  // Курьер
  courierProfile = () => this.http.get<CourierProfile>('/api/courier/profile');
  setShift = (isAvailable: boolean) => this.http.put<CourierProfile>('/api/courier/shift', { isAvailable });
  courierOrders = (active: boolean) => this.http.get<Order[]>('/api/courier/orders', { params: { active } });
  pickedUp = (id: number) => this.http.post<Order>(`/api/courier/orders/${id}/picked-up`, {});
  delivered = (id: number) => this.http.post<Order>(`/api/courier/orders/${id}/delivered`, {});

  // Суперадминистратор
  platformStats = () => this.http.get<PlatformStats>('/api/admin/stats');
  adminRestaurants = () => this.http.get<AdminRestaurant[]>('/api/admin/restaurants');
  setRestaurantStatus = (id: number, status: string) => this.http.post(`/api/admin/restaurants/${id}/status`, { status });
  users = () => this.http.get<User[]>('/api/admin/users');
  setUserActive = (id: number, isActive: boolean) => this.http.post<User>(`/api/admin/users/${id}/active`, { isActive });
  createCourier = (body: unknown) => this.http.post<User>('/api/admin/couriers', body);
  plans = () => this.http.get<Plan[]>('/api/admin/plans');

  /** Единая обработка ошибок: сообщение сервера выводится во всплывающем уведомлении. */
  fail = (e: HttpErrorResponse) =>
    this.toast.add({ severity: 'error', summary: this.i18n.t('error'), detail: e.error?.error ?? e.message, life: 5000 });

  ok = (detail: string) => this.toast.add({ severity: 'success', summary: this.i18n.t('done'), detail, life: 2500 });
}
