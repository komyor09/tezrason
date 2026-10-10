import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ApiService } from '../../core/api.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';
import { CourierProfile, Order } from '../../core/models';
import { LocalTimePipe, MoneyPipe, statusSeverity } from '../../core/ui';

/** Панель курьера (рис. 2.14): смена, назначенные заказы, одна кнопка следующего действия. */
@Component({
  selector: 'app-courier',
  imports: [FormsModule, ButtonModule, TagModule, ToggleSwitchModule, SelectButtonModule, TranslatePipe, MoneyPipe, LocalTimePipe],
  template: `
    <div class="container layout">
      <aside>
        @if (profile(); as p) {
          <div class="card pad row">
            <div class="avatar">{{ initials(p.fullName) }}</div>
            <div class="grow"><b>{{ p.fullName }}</b><div class="muted small">{{ 'tr_' + p.transportType | t }} · ★ {{ p.rating }}</div></div>
          </div>
          <div class="card pad between">
            <span>{{ 'onShift' | t }}</span>
            <p-toggleswitch [ngModel]="p.isAvailable" (ngModelChange)="shift($event)" />
          </div>
          <div class="card pad">
            <div class="muted small">{{ 'deliveredToday' | t }}</div><div class="kpiv">{{ p.deliveredToday }}</div>
            <div class="muted small">{{ 'cashToday' | t }}</div><div class="kpiv green">{{ p.cashToday | money }}</div>
          </div>
        }
      </aside>

      <section>
        <p-selectbutton [options]="tabs" [(ngModel)]="active" (ngModelChange)="load()" optionLabel="label" optionValue="value" [allowEmpty]="false" />
        @if (profile() && !profile()!.isAvailable && active) { <div class="hint"><i class="pi pi-info-circle"></i> {{ 'shiftOff' | t }}</div> }
        @for (o of orders(); track o.id) {
          <div class="card order">
            <div class="between"><div><b>{{ o.orderNumber }}</b> <span class="muted">· {{ o.createdAt | localTime }}</span></div>
              <p-tag [value]="'st_' + o.status | t" [severity]="sev(o.status)" /></div>
            <div class="cols">
              <div><div class="lbl">{{ 'from' | t }}</div>{{ o.restaurantName }}<div class="muted small">{{ o.restaurantAddress }}</div></div>
              <div><div class="lbl">{{ 'to' | t }}</div>{{ o.deliveryAddress }}@if (o.comment) { <div class="muted small">{{ o.comment }}</div> }</div>
              <div><div class="lbl">{{ 'clientToPay' | t }}</div>{{ o.clientName }} · {{ o.contactPhone }}<div><b class="green">{{ o.total | money }}</b>
                <span class="muted small"> ({{ o.paymentMethod | t }})</span></div></div>
            </div>
            <div class="row">
              @switch (o.status) {
                @case ('ready') { <p-button [label]="'pickedUp' | t" icon="pi pi-box" (onClick)="act(o, 'picked')" /> }
                @case ('on_the_way') { <p-button [label]="'deliveredBtn' | t" icon="pi pi-check" (onClick)="act(o, 'delivered')" /> }
                @case ('delivered') { <span class="muted small">{{ o.deliveredAt | localTime: true }}</span> }
                @default { <span class="muted small"><i class="pi pi-clock"></i> {{ 'waitingKitchen' | t }}</span> }
              }
              @if (o.status !== 'delivered') {
                <a [href]="'tel:' + o.contactPhone"><p-button [label]="'call' | t" icon="pi pi-phone" severity="success" [outlined]="true" /></a>
              }
            </div>
          </div>
        } @empty { <div class="card empty">{{ 'noOrders' | t }}</div> }
      </section>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 290px 1fr; gap: 24px; align-items: start; }
    aside { display: flex; flex-direction: column; gap: 14px; }
    .pad { padding: 18px; }
    .avatar { width: 48px; height: 48px; border-radius: 50%; background: #dbeafe; color: #1d4ed8; display: grid; place-items: center; font-weight: 600; }
    .grow { flex: 1; }
    .small { font-size: 12px; }
    .kpiv { font-size: 26px; font-weight: 600; margin: 2px 0 12px; }
    section { display: flex; flex-direction: column; gap: 14px; }
    .hint { background: #fef3c7; color: #92400e; padding: 10px 14px; border-radius: 8px; }
    .order { padding: 18px; }
    .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 12px 0 14px; }
    .lbl { font-size: 12px; color: var(--tz-muted); }
    @media (max-width: 900px) { .layout, .cols { grid-template-columns: 1fr; } }
  `,
})
export class CourierPage {
  private api = inject(ApiService);
  private i18n = inject(I18nService);
  profile = signal<CourierProfile | null>(null);
  orders = signal<Order[]>([]);
  active = true;
  tabs = [{ label: this.i18n.t('active'), value: true }, { label: this.i18n.t('completed'), value: false }];
  sev = statusSeverity;

  constructor() {
    this.refresh();
    const sub = interval(15000).subscribe(() => this.refresh());
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  refresh() { this.api.courierProfile().subscribe((p) => this.profile.set(p)); this.load(); }
  load() { this.api.courierOrders(this.active).subscribe({ next: (o) => this.orders.set(o), error: (e) => this.api.fail(e) }); }
  shift(v: boolean) { this.api.setShift(v).subscribe({ next: (p) => this.profile.set(p), error: (e) => this.api.fail(e) }); }
  act(o: Order, a: 'picked' | 'delivered') {
    (a === 'picked' ? this.api.pickedUp(o.id) : this.api.delivered(o.id)).subscribe({
      next: () => { this.refresh(); this.api.ok(this.i18n.t(a === 'picked' ? 'st_on_the_way' : 'st_delivered')); },
      error: (e) => this.api.fail(e),
    });
  }
  initials(n: string) { return n.split(' ').map((x) => x[0]).slice(0, 2).join(''); }
}
