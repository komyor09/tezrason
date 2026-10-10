// Модели данных, соответствующие DTO серверной части (TezRason.Api/Contracts/Dtos.cs)

export type Role = 'client' | 'courier' | 'restaurant_admin' | 'super_admin';
export type Lang = 'ru' | 'tj';
export type OrderStatus = 'new' | 'accepted' | 'cooking' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled';

export interface User { id: number; fullName: string; phone: string; email?: string; role: Role; language: Lang; isActive: boolean; }
export interface AuthResponse { token: string; expiresAt: string; user: User; }

export interface Restaurant {
  id: number; name: string; descriptionRu?: string; descriptionTj?: string; cuisine?: string; phone: string; addressLine: string;
  logoUrl?: string; minOrderAmount: number; deliveryFee: number; avgCookingMin: number; rating: number; status: string;
  isOpenNow: boolean; workingHoursToday?: string;
}
export interface Category { id: number; nameRu: string; nameTj: string; sortOrder: number; }
export interface Dish {
  id: number; categoryId: number; nameRu: string; nameTj: string; descriptionRu?: string; descriptionTj?: string;
  price: number; weightG?: number; imageUrl?: string; isAvailable: boolean;
}
export interface Promotion { id: number; titleRu: string; titleTj: string; discountType: 'percent' | 'fixed'; discountValue: number; startsAt: string; endsAt: string; isActive: boolean; }
export interface Menu { restaurant: Restaurant; categories: Category[]; dishes: Dish[]; promotions: Promotion[]; }

export interface OrderItem { dishId: number; dishName: string; unitPrice: number; quantity: number; lineTotal: number; }
export interface StatusHistory { status: OrderStatus; changedAt: string; changedByName?: string; comment?: string; }
export interface CourierInfo { id: number; fullName: string; phone: string; transportType: string; rating: number; }
export interface Order {
  id: number; orderNumber: string; status: OrderStatus; restaurantId: number; restaurantName: string; restaurantAddress?: string;
  clientId: number; clientName: string; deliveryAddress: string; contactPhone: string; subtotal: number; discount: number;
  deliveryFee: number; total: number; paymentMethod: string; comment?: string; createdAt: string; deliveredAt?: string;
  courier?: CourierInfo; items: OrderItem[]; history: StatusHistory[]; nextStatuses: OrderStatus[]; hasReview: boolean;
}

export interface NamedValue { name: string; value: number; }
export interface RestaurantStats {
  revenueToday: number; revenueWeek: number; revenueTotal: number; ordersTotal: number; ordersToday: number; activeOrders: number;
  averageCheck: number; rating: number; topDishes: NamedValue[]; revenueByDay: NamedValue[];
}
export interface PlatformStats {
  activeRestaurants: number; pendingRestaurants: number; blockedRestaurants: number; ordersToday: number; ordersTotal: number;
  revenueTotal: number; clients: number; couriers: number; couriersOnShift: number; ordersByStatus: NamedValue[];
}
export interface CourierProfile {
  id: number; fullName: string; phone: string; transportType: string; isAvailable: boolean; rating: number;
  deliveredToday: number; cashToday: number; activeOrders: number;
}
export interface AdminRestaurant {
  id: number; name: string; cuisine?: string; status: string; ownerName: string; ownerPhone: string; planName?: string;
  ordersMonth: number; rating: number; createdAt: string;
}
export interface Plan { id: number; name: string; monthlyPrice: number; maxDishes?: number; hasAnalytics: boolean; }
export interface CartLine { dish: Dish; quantity: number; }
