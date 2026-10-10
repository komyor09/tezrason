import { Injectable, computed, signal } from '@angular/core';
import { CartLine, Dish, Restaurant } from './models';

interface CartState { restaurant: Restaurant | null; lines: CartLine[]; }
const KEY = 'tz_cart';

/**
 * Корзина клиента. Хранится на стороне браузера (по решению 2.1 — не в БД).
 * В корзине могут быть блюда только одного заведения.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly state = signal<CartState>(this.restore());

  readonly restaurant = computed(() => this.state().restaurant);
  readonly lines = computed(() => this.state().lines);
  readonly count = computed(() => this.lines().reduce((s, l) => s + l.quantity, 0));
  readonly subtotal = computed(() => this.lines().reduce((s, l) => s + l.dish.price * l.quantity, 0));
  readonly total = computed(() => (this.lines().length ? this.subtotal() + (this.restaurant()?.deliveryFee ?? 0) : 0));
  readonly belowMinimum = computed(() => this.subtotal() < (this.restaurant()?.minOrderAmount ?? 0));

  quantity(dishId: number) { return this.lines().find((l) => l.dish.id === dishId)?.quantity ?? 0; }

  add(restaurant: Restaurant, dish: Dish) {
    const s = this.state();
    const sameRestaurant = s.restaurant?.id === restaurant.id;
    const lines = sameRestaurant ? [...s.lines] : [];       // новое заведение — корзина очищается
    const line = lines.find((l) => l.dish.id === dish.id);
    if (line) line.quantity = Math.min(line.quantity + 1, 50);
    else lines.push({ dish, quantity: 1 });
    this.commit({ restaurant, lines });
  }

  change(dishId: number, delta: number) {
    const s = this.state();
    const lines = s.lines.map((l) => (l.dish.id === dishId ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0);
    this.commit({ restaurant: lines.length ? s.restaurant : null, lines });
  }

  clear() { this.commit({ restaurant: null, lines: [] }); }

  private commit(s: CartState) {
    this.state.set(s);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }

  private restore(): CartState {
    try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') ?? { restaurant: null, lines: [] }; }
    catch { return { restaurant: null, lines: [] }; }
  }
}
