import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { CartService } from '../../core/cart.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';
import { MoneyPipe } from '../../core/ui';

/** Оформление заказа (рис. 2.9–2.10): корзина, адрес, оплата при получении. */
@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, TextareaModule, RadioButtonModule, TranslatePipe, MoneyPipe],
  template: `
    <div class="container narrow">
      <a [routerLink]="'/restaurant/' + cart.restaurant()?.id" class="back muted"><i class="pi pi-arrow-left"></i> {{ cart.restaurant()?.name }}</a>
      <h1 class="page-title"><i class="pi pi-shopping-cart green"></i> {{ 'checkout' | t }}</h1>

      @if (cart.lines().length) {
        <div class="card box">
          <div class="section-title">{{ 'cart' | t }}</div>
          @for (l of cart.lines(); track l.dish.id) {
            <div class="line">
              <div class="ph pic"><i class="pi pi-image"></i></div>
              <div class="grow"><div>{{ i18n.pick(l.dish, 'name') }}</div><div class="muted small">{{ l.dish.price | money }}</div></div>
              <div class="qty">
                <p-button icon="pi pi-minus" [text]="true" size="small" (onClick)="cart.change(l.dish.id, -1)" />
                <span>{{ l.quantity }}</span>
                <p-button icon="pi pi-plus" [text]="true" size="small" (onClick)="cart.change(l.dish.id, 1)" />
              </div>
              <b class="sum">{{ l.dish.price * l.quantity | money }}</b>
            </div>
          }
          <div class="between muted"><span>{{ 'subtotal' | t }}</span><span>{{ cart.subtotal() | money }}</span></div>
          <div class="between muted"><span>{{ 'delivery' | t }}</span><span>{{ cart.restaurant()?.deliveryFee | money }}</span></div>
          <div class="between total"><b>{{ 'total' | t }}</b><b class="green">{{ cart.total() | money }}</b></div>
        </div>

        <div class="card box form">
          <label>{{ 'address' | t }}</label>
          <input pInputText [(ngModel)]="address" placeholder="ул. Камоли Худжанди, 12, кв. 34" />
          <label>{{ 'contactPhone' | t }}</label>
          <input pInputText [(ngModel)]="phone" />
          <label>{{ 'comment' | t }}</label>
          <textarea pTextarea [(ngModel)]="comment" rows="2"></textarea>
          <label>{{ 'payment' | t }}</label>
          <div class="row">
            <p-radiobutton inputId="cash" name="pay" value="cash" [(ngModel)]="payment" /><label for="cash" class="inline">{{ 'cash' | t }}</label>
            <p-radiobutton inputId="card" name="pay" value="card_on_delivery" [(ngModel)]="payment" /><label for="card" class="inline">{{ 'card_on_delivery' | t }}</label>
          </div>
          <p-button [label]="'confirmOrder' | t" icon="pi pi-check" [loading]="busy()" (onClick)="submit()" [style]="{ width: '100%', marginTop: '18px' }"
                    [disabled]="cart.belowMinimum()" />
          @if (cart.belowMinimum()) { <div class="muted small center">{{ 'minOrder' | t }} — {{ cart.restaurant()?.minOrderAmount | money }}</div> }
        </div>
      } @else {
        <div class="card empty">{{ 'cartEmpty' | t }}</div>
      }
    </div>
  `,
  styles: `
    .narrow { max-width: 760px; }
    .back { display: inline-flex; gap: 6px; align-items: center; margin-bottom: 12px; }
    .box { padding: 20px; margin-bottom: 16px; }
    .line { display: flex; align-items: center; gap: 14px; background: #f8fafc; border-radius: 10px; padding: 10px 14px; margin-bottom: 10px; }
    .pic { width: 52px; height: 52px; border-radius: 8px; }
    .grow { flex: 1; }
    .small { font-size: 12px; }
    .qty { display: flex; align-items: center; gap: 2px; background: #fff; border-radius: 8px; }
    .sum { width: 110px; text-align: right; }
    .between { margin: 8px 0; }
    .total { font-size: 17px; border-top: 1px solid var(--tz-border); padding-top: 12px; }
    .form { display: flex; flex-direction: column; }
    .form label { font-size: 13px; color: #334155; margin: 12px 0 6px; }
    .form label.inline { margin: 0 16px 0 0; }
    .center { text-align: center; margin-top: 8px; }
  `,
})
export class CheckoutPage {
  private api = inject(ApiService);
  private router = inject(Router);
  cart = inject(CartService);
  i18n = inject(I18nService);
  address = '';
  phone = inject(AuthService).user()?.phone ?? '';
  comment = '';
  payment = 'cash';
  busy = signal(false);

  submit() {
    this.busy.set(true);
    this.api.createOrder({
      restaurantId: this.cart.restaurant()!.id,
      items: this.cart.lines().map((l) => ({ dishId: l.dish.id, quantity: l.quantity })),
      deliveryAddress: this.address, contactPhone: this.phone, paymentMethod: this.payment, comment: this.comment,
    }).subscribe({
      next: (o) => { this.cart.clear(); this.router.navigate(['/orders', o.id]); },
      error: (e) => { this.busy.set(false); this.api.fail(e); },
    });
  }
}
