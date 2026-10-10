import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { RatingModule } from 'primeng/rating';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';
import { ApiService } from '../../core/api.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';
import { Order, OrderStatus } from '../../core/models';
import { LocalTimePipe, MoneyPipe, statusSeverity } from '../../core/ui';

const FLOW: OrderStatus[] = ['new', 'accepted', 'cooking', 'ready', 'on_the_way', 'delivered'];

/** Отслеживание заказа (рис. 2.11): шкала статусов, курьер, состав, отзыв. Обновляется каждые 15 секунд. */
@Component({
  selector: 'app-order-tracking',
  imports: [FormsModule, RouterLink, ButtonModule, RatingModule, TextareaModule, TagModule, TranslatePipe, MoneyPipe, LocalTimePipe],
  template: `
    @if (order(); as o) {
      <div class="container layout">
        <div class="card box">
          <a routerLink="/orders" class="back muted"><i class="pi pi-arrow-left"></i> {{ 'myOrders' | t }}</a>
          <div class="muted small">{{ 'order' | t }} {{ o.orderNumber }} · {{ o.restaurantName }}</div>
          <div class="between"><h1>{{ 'st_' + o.status | t }}</h1><p-tag [value]="'st_' + o.status | t" [severity]="sev(o.status)" /></div>

          @if (o.status === 'cancelled') {
            <div class="cancel">{{ o.history[o.history.length - 1].comment }}</div>
          } @else {
            <div class="steps">
              @for (s of flow; track s; let i = $index) {
                <div class="step" [class.done]="reached(o, i)" [class.current]="o.status === s && s !== 'delivered'">
                  <div class="dot">@if (reached(o, i) && o.status !== s) { <i class="pi pi-check"></i> } @else { {{ i + 1 }} }</div>
                  <div><div class="sname">{{ 'st_' + s | t }}</div>
                    @if (timeOf(o, s); as t) { <div class="muted small">{{ t | localTime }}</div> }</div>
                </div>
              }
            </div>
          }
          @if (o.status === 'new') {
            <p-button [label]="'cancelOrder' | t" severity="danger" [outlined]="true" (onClick)="cancel()" />
          }
        </div>

        <div class="side">
          @if (o.courier; as c) {
            <div class="card box">
              <div class="section-title">{{ 'courier' | t }}</div>
              <div class="row"><div class="avatar">{{ initials(c.fullName) }}</div>
                <div class="grow"><b>{{ c.fullName }}</b><div class="muted small">{{ 'tr_' + c.transportType | t }} · ★ {{ c.rating }}</div></div>
                <a [href]="'tel:' + c.phone"><p-button [label]="'call' | t" icon="pi pi-phone" severity="success" [outlined]="true" size="small" /></a>
              </div>
            </div>
          }
          <div class="card box">
            <div class="section-title">{{ 'composition' | t }}</div>
            @for (i of o.items; track i.dishId) { <div class="between line"><span>{{ i.dishName }} × {{ i.quantity }}</span><span>{{ i.lineTotal }}</span></div> }
            @if (o.discount > 0) { <div class="between line green"><span>{{ 'discount' | t }}</span><span>−{{ o.discount }}</span></div> }
            <div class="between line muted"><span>{{ 'delivery' | t }}</span><span>{{ o.deliveryFee }}</span></div>
            <div class="between total"><b>{{ 'total' | t }}</b><b class="green">{{ o.total | money }}</b></div>
          </div>
          <div class="card box">
            <div class="section-title">{{ 'delivery' | t }}</div>
            <div class="muted">{{ o.deliveryAddress }}</div>
            <div class="muted">{{ 'payment' | t }} · {{ o.paymentMethod | t }}</div>
          </div>
          @if (o.status === 'delivered') {
            <div class="card box">
              @if (o.hasReview) { <div class="green"><i class="pi pi-heart-fill"></i> {{ 'thanksReview' | t }}</div> }
              @else {
                <div class="section-title">{{ 'leaveReview' | t }}</div>
                <div class="between"><span>{{ 'food' | t }}</span><p-rating [(ngModel)]="food" /></div>
                <div class="between"><span>{{ 'delivery' | t }}</span><p-rating [(ngModel)]="deliveryRate" /></div>
                <textarea pTextarea [(ngModel)]="reviewText" rows="2" class="full"></textarea>
                <p-button [label]="'send' | t" (onClick)="sendReview()" [style]="{ width: '100%' }" />
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; max-width: 1000px; }
    .box { padding: 22px; margin-bottom: 16px; }
    .back { display: inline-flex; gap: 6px; align-items: center; margin-bottom: 12px; }
    h1 { font-size: 21px; margin: 6px 0 18px; }
    .small { font-size: 12px; }
    .steps { display: flex; flex-direction: column; margin-bottom: 16px; }
    .step { display: flex; gap: 14px; position: relative; padding-bottom: 22px; }
    .step:not(:last-child)::after { content: ''; position: absolute; left: 14px; top: 30px; bottom: 0; width: 2px; background: #e2e8f0; }
    .step.done:not(:last-child)::after { background: var(--tz-primary); }
    .dot { width: 30px; height: 30px; border-radius: 50%; background: #e2e8f0; color: #64748b; display: grid; place-items: center; font-size: 13px; flex-shrink: 0; }
    .step.done .dot { background: var(--tz-primary); color: #fff; }
    .step.current .dot { background: #f59e0b; color: #fff; }
    .sname { font-weight: 500; }
    .step:not(.done) .sname { color: var(--tz-muted); }
    .cancel { background: #fee2e2; color: #b91c1c; padding: 12px; border-radius: 8px; }
    .avatar { width: 44px; height: 44px; border-radius: 50%; background: #dbeafe; color: #1d4ed8; display: grid; place-items: center; font-weight: 600; }
    .grow { flex: 1; }
    .line { margin: 8px 0; }
    .total { border-top: 1px solid var(--tz-border); padding-top: 10px; margin-top: 10px; }
    .full { width: 100%; margin: 10px 0; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class OrderTrackingPage {
  readonly id = input.required<string>();
  private api = inject(ApiService);
  i18n = inject(I18nService);
  order = signal<Order | null>(null);
  flow = FLOW;
  food = 5;
  deliveryRate = 5;
  reviewText = '';
  sev = statusSeverity;

  constructor() {
    effect(() => this.load());
    const sub = interval(15000).subscribe(() => { if (this.order()?.status !== 'delivered') this.load(); });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  load() { this.api.order(+this.id()).subscribe({ next: (o) => this.order.set(o), error: (e) => this.api.fail(e) }); }
  reached(o: Order, i: number) { return FLOW.indexOf(o.status) >= i; }
  timeOf(o: Order, s: string) { return o.history.find((h) => h.status === s)?.changedAt; }
  initials(n: string) { return n.split(' ').map((x) => x[0]).slice(0, 2).join(''); }
  cancel() { this.api.cancelOrder(this.order()!.id).subscribe({ next: (o) => this.order.set(o), error: (e) => this.api.fail(e) }); }
  sendReview() {
    this.api.review(this.order()!.id, { foodRating: this.food, deliveryRating: this.deliveryRate, comment: this.reviewText })
      .subscribe({ next: (o) => this.order.set(o), error: (e) => this.api.fail(e) });
  }
}
