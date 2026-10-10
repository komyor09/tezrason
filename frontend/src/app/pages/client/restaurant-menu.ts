import { Component, computed, inject, input, signal, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';
import { Dish, Menu } from '../../core/models';
import { MoneyPipe } from '../../core/ui';

/** Страница меню заведения: категории, карточки блюд и корзина (рис. 2.8). */
@Component({
  selector: 'app-restaurant-menu',
  imports: [RouterLink, DecimalPipe, ButtonModule, TagModule, TranslatePipe, MoneyPipe],
  template: `
    @if (menu(); as m) {
      <div class="container layout">
        <div>
          <a routerLink="/" class="back muted"><i class="pi pi-arrow-left"></i> {{ 'allRestaurants' | t }}</a>
          <div class="card head">
            <div class="ph logo"><i class="pi pi-shop"></i></div>
            <div>
              <h1>{{ m.restaurant.name }}</h1>
              <div class="muted">{{ m.restaurant.cuisine }} · {{ m.restaurant.addressLine }}</div>
              <div class="row meta">
                <p-tag [value]="(m.restaurant.isOpenNow ? 'open' : 'closed') | t" [severity]="m.restaurant.isOpenNow ? 'success' : 'secondary'" />
                @if (m.restaurant.workingHoursToday) { <span class="muted">{{ m.restaurant.workingHoursToday }}</span> }
                <span class="muted"><i class="pi pi-star-fill star"></i> {{ m.restaurant.rating | number: '1.1-1' }} ·
                  {{ m.restaurant.avgCookingMin }}–{{ m.restaurant.avgCookingMin + 15 }} {{ 'min' | t }} · {{ 'delivery' | t }} {{ m.restaurant.deliveryFee | money }}</span>
              </div>
            </div>
          </div>

          @for (p of m.promotions; track p.id) {
            <div class="promo"><i class="pi pi-percentage"></i> {{ i18n.pick(p, 'title') }}</div>
          }

          <div class="chip-row tabs">
            @for (c of m.categories; track c.id) {
              <button class="chip" [class.on]="activeCategory() === c.id" (click)="activeCategory.set(c.id)">{{ i18n.pick(c, 'name') }}</button>
            }
          </div>

          <div class="grid dishes">
            @for (d of visibleDishes(); track d.id) {
              <div class="card dish">
                <div class="ph pic"><i class="pi pi-image"></i></div>
                <div class="info">
                  <div class="dname">{{ i18n.pick(d, 'name') }}</div>
                  <div class="muted small">{{ i18n.pick(d, 'description') }}@if (d.weightG) { · {{ d.weightG }} г }</div>
                  <b>{{ d.price | money }}</b>
                </div>
                @if (cart.quantity(d.id); as q) {
                  <div class="qty">
                    <p-button icon="pi pi-minus" [text]="true" size="small" (onClick)="cart.change(d.id, -1)" />
                    <span>{{ q }}</span>
                    <p-button icon="pi pi-plus" [text]="true" size="small" (onClick)="add(d)" />
                  </div>
                } @else {
                  <p-button icon="pi pi-plus" (onClick)="add(d)" [disabled]="!m.restaurant.isOpenNow" />
                }
              </div>
            }
          </div>
        </div>

        <aside class="card cart">
          <div class="section-title">{{ 'cart' | t }}</div>
          @if (cart.restaurant()?.id === m.restaurant.id && cart.lines().length) {
            @for (l of cart.lines(); track l.dish.id) {
              <div class="between line"><span>{{ i18n.pick(l.dish, 'name') }} × {{ l.quantity }}</span><b>{{ l.dish.price * l.quantity | number: '1.0-2' }}</b></div>
            }
            <div class="between line muted sep"><span>{{ 'delivery' | t }}</span><span>{{ m.restaurant.deliveryFee | number: '1.0-2' }}</span></div>
            <div class="between totalrow"><b>{{ 'total' | t }}</b><b class="green">{{ cart.total() | money }}</b></div>
            <p-button [label]="'toCheckout' | t" [style]="{ width: '100%' }" [disabled]="cart.belowMinimum()" (onClick)="checkout()" />
            <div class="muted small center">{{ 'minOrder' | t }} — {{ m.restaurant.minOrderAmount | money }}</div>
          } @else {
            <div class="empty small"><i class="pi pi-shopping-cart big"></i><br />{{ 'cartEmpty' | t }}</div>
          }
        </aside>
      </div>
    }
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 1fr 330px; gap: 24px; align-items: start; }
    .back { display: inline-flex; gap: 6px; align-items: center; margin-bottom: 12px; }
    .head { display: flex; gap: 18px; align-items: center; padding: 20px; }
    .logo { width: 76px; height: 76px; border-radius: 12px; flex-shrink: 0; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .meta { margin-top: 8px; flex-wrap: wrap; font-size: 13px; }
    .star { color: #f59e0b; font-size: 12px; }
    .promo { margin-top: 12px; background: #ecfdf5; color: #047857; border-radius: 10px; padding: 10px 14px; font-weight: 500; }
    .tabs { margin: 18px 0; }
    .chip { border: 0; background: #f1f5f9; color: #475569; border-radius: 999px; padding: 8px 16px; cursor: pointer; font: inherit; }
    .chip.on { background: #dcfce7; color: #15803d; font-weight: 500; }
    .dishes { grid-template-columns: 1fr 1fr; gap: 14px; }
    .dish { display: flex; gap: 14px; align-items: center; padding: 12px; }
    .pic { width: 80px; height: 80px; border-radius: 8px; flex-shrink: 0; }
    .info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .dname { font-weight: 500; }
    .small { font-size: 12px; }
    .qty { display: flex; align-items: center; gap: 2px; background: #f8fafc; border-radius: 8px; }
    .cart { padding: 20px; position: sticky; top: 88px; }
    .line { margin: 10px 0; }
    .sep { border-top: 1px solid var(--tz-border); padding-top: 12px; }
    .totalrow { font-size: 17px; margin: 12px 0 16px; }
    .center { text-align: center; margin-top: 10px; }
    .big { font-size: 28px; margin-bottom: 8px; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .dishes { grid-template-columns: 1fr; } .cart { position: static; } }
  `,
})
export class RestaurantMenuPage {
  readonly id = input.required<string>();
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  cart = inject(CartService);
  i18n = inject(I18nService);
  menu = signal<Menu | null>(null);
  activeCategory = signal<number | null>(null);
  visibleDishes = computed(() => this.menu()?.dishes.filter((d) => d.categoryId === this.activeCategory()) ?? []);

  constructor() {
    effect(() => {
      this.api.menu(+this.id()).subscribe({
        next: (m) => { this.menu.set(m); this.activeCategory.set(m.categories[0]?.id ?? null); },
        error: (e) => this.api.fail(e),
      });
    });
  }

  add(d: Dish) { this.cart.add(this.menu()!.restaurant, d); }

  checkout() {
    this.router.navigateByUrl(this.auth.isLoggedIn() ? '/checkout' : '/login');
  }
}
