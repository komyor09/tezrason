import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { BadgeModule } from 'primeng/badge';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { I18nService, TranslatePipe } from '../core/i18n.service';

/** Шапка страницы: логотип, навигация по роли, переключатель языка RU/TJ, вход/выход. */
@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, FormsModule, ButtonModule, SelectButtonModule, BadgeModule, TranslatePipe],
  template: `
    <header class="top">
      <div class="inner">
        <a class="logo" [routerLink]="home()">
          <span class="ic"><i class="pi pi-shopping-bag"></i></span>
          <span><b>TezRason</b><small>{{ 'appSubtitle' | t }}</small></span>
        </a>

        <nav class="nav hide-mobile">
          @switch (auth.user()?.role) {
            @case ('restaurant_admin') { <span class="title">{{ 'adminPanel' | t }}</span> }
            @case ('courier') { <span class="title">{{ 'courierPanel' | t }}</span> }
            @case ('super_admin') { <span class="title">{{ 'superPanel' | t }}</span> }
            @default {
              <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">{{ 'restaurants' | t }}</a>
              @if (auth.user()) { <a routerLink="/orders" routerLinkActive="on">{{ 'myOrders' | t }}</a> }
            }
          }
        </nav>

        <div class="right">
          @if (cart.count() > 0 && (!auth.user() || auth.user()?.role === 'client')) {
            <a [routerLink]="'/restaurant/' + cart.restaurant()?.id" class="cart">
              <i class="pi pi-shopping-cart" pBadge [value]="cart.count().toString()"></i>
            </a>
          }
          <p-selectbutton [options]="langs" [ngModel]="i18n.lang()" (ngModelChange)="auth.setLanguage($event)"
                          optionLabel="label" optionValue="value" [allowEmpty]="false" size="small" />
          @if (auth.user(); as u) {
            <span class="user hide-mobile">{{ u.fullName }}</span>
            <p-button icon="pi pi-sign-out" [text]="true" severity="secondary" (onClick)="auth.logout()" [ariaLabel]="'logout' | t" />
          } @else {
            <p-button [label]="'login' | t" icon="pi pi-user" size="small" routerLink="/login" />
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    .top { height: 68px; background: #fff; border-bottom: 1px solid var(--tz-border); position: sticky; top: 0; z-index: 10; }
    .inner { max-width: 1160px; margin: 0 auto; height: 100%; padding: 0 16px; display: flex; align-items: center; gap: 28px; }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo .ic { width: 36px; height: 36px; border-radius: 9px; background: var(--tz-primary); color: #fff; display: grid; place-items: center; }
    .logo b { display: block; color: var(--tz-primary); font-size: 15px; }
    .logo small { color: var(--tz-muted); font-size: 11px; }
    .nav { display: flex; gap: 20px; }
    .nav a { color: #475569; padding: 6px 0; border-bottom: 2px solid transparent; }
    .nav a.on { color: var(--tz-primary); border-color: var(--tz-primary); }
    .nav .title { font-weight: 500; }
    .right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
    .user { color: #334155; }
    .cart { font-size: 20px; color: var(--tz-primary); margin-right: 8px; }
  `,
})
export class HeaderComponent {
  auth = inject(AuthService);
  cart = inject(CartService);
  i18n = inject(I18nService);
  langs = [{ label: 'RU', value: 'ru' }, { label: 'TJ', value: 'tj' }];
  home = computed(() => this.auth.homeFor(this.auth.user()?.role));
}
