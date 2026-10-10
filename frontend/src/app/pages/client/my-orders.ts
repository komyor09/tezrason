import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { ApiService } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n.service';
import { Order } from '../../core/models';
import { LocalTimePipe, MoneyPipe, statusSeverity } from '../../core/ui';

/** История заказов клиента. */
@Component({
  selector: 'app-my-orders',
  imports: [RouterLink, TagModule, TranslatePipe, MoneyPipe, LocalTimePipe],
  template: `
    <div class="container narrow">
      <h1 class="page-title">{{ 'myOrders' | t }}</h1>
      @for (o of orders(); track o.id) {
        <a class="card item" [routerLink]="['/orders', o.id]">
          <div class="grow">
            <div class="row"><b>{{ o.orderNumber }}</b><span class="muted">· {{ o.restaurantName }}</span></div>
            <div class="muted small">{{ o.createdAt | localTime: true }} · {{ o.items.length }} поз.</div>
          </div>
          <p-tag [value]="'st_' + o.status | t" [severity]="sev(o.status)" />
          <b class="sum">{{ o.total | money }}</b>
          <i class="pi pi-chevron-right muted"></i>
        </a>
      } @empty { <div class="card empty">{{ 'noOrders' | t }}</div> }
    </div>
  `,
  styles: `
    .narrow { max-width: 800px; }
    .item { display: flex; align-items: center; gap: 16px; padding: 16px 18px; margin-bottom: 12px; }
    .item:hover { box-shadow: 0 4px 14px rgba(15, 23, 42, .08); }
    .grow { flex: 1; }
    .small { font-size: 12px; margin-top: 4px; }
    .sum { width: 120px; text-align: right; }
  `,
})
export class MyOrdersPage {
  private api = inject(ApiService);
  orders = signal<Order[]>([]);
  sev = statusSeverity;
  constructor() { this.api.myOrders().subscribe({ next: (o) => this.orders.set(o), error: (e) => this.api.fail(e) }); }
}
