import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TableModule } from 'primeng/table';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ApiService } from '../../core/api.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';
import { CourierInfo, Dish, Menu, Order, OrderStatus, RestaurantStats } from '../../core/models';
import { LocalTimePipe, MoneyPipe, statusSeverity } from '../../core/ui';

/** Панель администратора заведения (рис. 2.12): заказы, меню, статистика. */
@Component({
  selector: 'app-manage',
  imports: [FormsModule, DecimalPipe, ButtonModule, TabsModule, TagModule, DialogModule, SelectModule, InputTextModule, InputNumberModule,
    ToggleSwitchModule, TableModule, SelectButtonModule, TranslatePipe, MoneyPipe, LocalTimePipe],
  template: `
    <div class="container">
      <div class="between"><h1 class="page-title">{{ menu()?.restaurant?.name }}</h1>
        <span class="muted">★ {{ menu()?.restaurant?.rating | number: '1.1-1' }}</span></div>

      <p-tabs [(value)]="tab">
        <p-tablist>
          <p-tab value="orders"><i class="pi pi-box"></i> {{ 'orders' | t }} @if (activeCount()) { <span class="count">{{ activeCount() }}</span> }</p-tab>
          <p-tab value="menu"><i class="pi pi-book"></i> {{ 'menu' | t }}</p-tab>
          <p-tab value="stats"><i class="pi pi-chart-bar"></i> {{ 'stats' | t }}</p-tab>
        </p-tablist>
        <p-tabpanels>
          <!-- ============ ЗАКАЗЫ ============ -->
          <p-tabpanel value="orders">
            <p-selectbutton [options]="filters" [(ngModel)]="filter" (ngModelChange)="loadOrders()" optionLabel="label" optionValue="value" [allowEmpty]="false" />
            <div class="orders">
              @for (o of orders(); track o.id) {
                <div class="card order">
                  <div class="between">
                    <div><b>{{ o.orderNumber }}</b> <span class="muted">· {{ o.createdAt | localTime }}</span></div>
                    <p-tag [value]="'st_' + o.status | t" [severity]="sev(o.status)" />
                  </div>
                  <div class="cols">
                    <div><div class="lbl">{{ 'composition' | t }}</div>
                      @for (i of o.items; track i.dishId) { <div>{{ i.dishName }} × {{ i.quantity }}</div> }
                      @if (o.comment) { <div class="muted small">💬 {{ o.comment }}</div> }</div>
                    <div><div class="lbl">{{ 'to' | t }}</div><div>{{ o.deliveryAddress }}</div><div class="muted small">{{ o.clientName }} · {{ o.contactPhone }}</div></div>
                    <div><div class="lbl">{{ 'courier' | t }}</div>
                      @if (o.courier) { <div>{{ o.courier.fullName }}</div><div class="muted small">{{ o.courier.phone }}</div> }
                      @else if (canAssign(o)) { <p-button [label]="'assignCourier' | t" icon="pi pi-user-plus" size="small" [outlined]="true" (onClick)="openAssign(o)" /> }
                      @else { <span class="muted">—</span> }</div>
                    <div class="right"><div class="lbl">{{ 'total' | t }}</div><b class="green big">{{ o.total | money }}</b></div>
                  </div>
                  @if (o.nextStatuses.length) {
                    <div class="actions">
                      @for (s of o.nextStatuses; track s) {
                        <p-button [label]="'act_' + s | t" size="small" [severity]="s === 'cancelled' ? 'danger' : 'primary'" [outlined]="s === 'cancelled'"
                                  (onClick)="change(o, s)" />
                      }
                      @if (o.courier && o.status !== 'ready' && o.status !== 'on_the_way' && canAssign(o)) {
                        <p-button [label]="'assignCourier' | t" size="small" severity="secondary" [text]="true" (onClick)="openAssign(o)" />
                      }
                    </div>
                  }
                </div>
              } @empty { <div class="card empty">{{ 'noOrders' | t }}</div> }
            </div>
          </p-tabpanel>

          <!-- ============ МЕНЮ ============ -->
          <p-tabpanel value="menu">
            <div class="between bar-top">
              <div class="chip-row">
                @for (c of menu()?.categories ?? []; track c.id) {
                  <button class="chip" [class.on]="category() === c.id" (click)="category.set(c.id)">{{ i18n.pick(c, 'name') }}</button>
                }
              </div>
              <div class="row">
                <p-button [label]="'addCategory' | t" icon="pi pi-plus" [outlined]="true" size="small" (onClick)="catDialog = true" />
                <p-button [label]="'addDish' | t" icon="pi pi-plus" size="small" (onClick)="editDish()" />
              </div>
            </div>
            <p-table [value]="dishes()" styleClass="card" [tableStyle]="{ 'min-width': '640px' }">
              <ng-template #header><tr><th>{{ 'nameRu' | t }}</th><th>{{ 'nameTj' | t }}</th><th>{{ 'price' | t }}</th><th>{{ 'available' | t }}</th><th></th></tr></ng-template>
              <ng-template #body let-d>
                <tr [class.off]="!d.isAvailable">
                  <td><b>{{ d.nameRu }}</b><div class="muted small">{{ d.descriptionRu }}</div></td>
                  <td>{{ d.nameTj }}</td>
                  <td>{{ d.price | money }}</td>
                  <td><p-toggleswitch [ngModel]="d.isAvailable" (ngModelChange)="toggle(d, $event)" /></td>
                  <td class="right"><p-button icon="pi pi-pencil" [text]="true" (onClick)="editDish(d)" />
                    <p-button icon="pi pi-trash" [text]="true" severity="danger" (onClick)="removeDish(d)" /></td>
                </tr>
              </ng-template>
            </p-table>
          </p-tabpanel>

          <!-- ============ СТАТИСТИКА ============ -->
          <p-tabpanel value="stats">
            @if (stats(); as s) {
              <div class="grid kpis">
                <div class="card kpi"><div class="label">{{ 'revenueToday' | t }}</div><div class="value">{{ s.revenueToday | money }}</div></div>
                <div class="card kpi"><div class="label">{{ 'revenueWeek' | t }}</div><div class="value">{{ s.revenueWeek | money }}</div></div>
                <div class="card kpi"><div class="label">{{ 'ordersTotal' | t }}</div><div class="value">{{ s.ordersTotal }}</div></div>
                <div class="card kpi"><div class="label">{{ 'averageCheck' | t }}</div><div class="value">{{ s.averageCheck | money }}</div></div>
              </div>
              <div class="grid two">
                <div class="card pad"><div class="section-title">{{ 'revenueByDay' | t }}</div>
                  @for (d of s.revenueByDay; track d.name) {
                    <div class="between small"><span>{{ d.name }}</span><span>{{ d.value | money }}</span></div>
                    <div class="bar"><div [style.width.%]="pct(d.value, maxDay())"></div></div>
                  }</div>
                <div class="card pad"><div class="section-title">{{ 'topDishes' | t }}</div>
                  @for (d of s.topDishes; track d.name) {
                    <div class="between small"><span>{{ d.name }}</span><span class="muted">{{ d.value }} {{ 'pcs' | t }}</span></div>
                    <div class="bar"><div [style.width.%]="pct(d.value, s.topDishes[0].value)"></div></div>
                  }</div>
              </div>
            }
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>

    <!-- Диалог назначения курьера -->
    <p-dialog [header]="'assignCourier' | t" [(visible)]="assignDialog" [modal]="true" [style]="{ width: '420px' }">
      @if (couriers().length) {
        <p-select [options]="couriers()" [(ngModel)]="courierId" optionLabel="fullName" optionValue="id" [style]="{ width: '100%' }" appendTo="body">
          <ng-template #item let-c>{{ c.fullName }} · {{ 'tr_' + c.transportType | t }} · ★ {{ c.rating }}</ng-template>
        </p-select>
      } @else { <div class="muted">{{ 'noCouriers' | t }}</div> }
      <ng-template #footer><p-button [label]="'save' | t" (onClick)="assign()" [disabled]="!courierId" /></ng-template>
    </p-dialog>

    <!-- Диалог блюда -->
    <p-dialog [header]="dish.id ? ('edit' | t) : ('addDish' | t)" [(visible)]="dishDialog" [modal]="true" [style]="{ width: '480px' }">
      <div class="form">
        <label>{{ 'category' | t }}</label>
        <p-select [options]="menu()?.categories ?? []" [(ngModel)]="dish.categoryId" optionLabel="nameRu" optionValue="id" appendTo="body" />
        <label>{{ 'nameRu' | t }}</label><input pInputText [(ngModel)]="dish.nameRu" />
        <label>{{ 'nameTj' | t }}</label><input pInputText [(ngModel)]="dish.nameTj" />
        <label>{{ 'descriptionRu' | t }}</label><input pInputText [(ngModel)]="dish.descriptionRu" />
        <div class="row">
          <div class="grow"><label>{{ 'price' | t }}</label><p-inputnumber [(ngModel)]="dish.price" [min]="0" mode="decimal" [maxFractionDigits]="2" /></div>
          <div class="grow"><label>{{ 'weight' | t }}</label><p-inputnumber [(ngModel)]="dish.weightG" [min]="0" /></div>
        </div>
      </div>
      <ng-template #footer><p-button [label]="'cancel' | t" [text]="true" (onClick)="dishDialog = false" /><p-button [label]="'save' | t" (onClick)="saveDish()" /></ng-template>
    </p-dialog>

    <!-- Диалог категории -->
    <p-dialog [header]="'addCategory' | t" [(visible)]="catDialog" [modal]="true" [style]="{ width: '400px' }">
      <div class="form"><label>{{ 'nameRu' | t }}</label><input pInputText [(ngModel)]="cat.nameRu" />
        <label>{{ 'nameTj' | t }}</label><input pInputText [(ngModel)]="cat.nameTj" /></div>
      <ng-template #footer><p-button [label]="'save' | t" (onClick)="saveCategory()" /></ng-template>
    </p-dialog>
  `,
  styles: `
    .count { background: var(--tz-primary); color: #fff; border-radius: 999px; padding: 1px 8px; font-size: 12px; margin-left: 6px; }
    .orders { margin-top: 16px; display: flex; flex-direction: column; gap: 14px; }
    .order { padding: 16px 18px; }
    .cols { display: grid; grid-template-columns: 1.3fr 1.3fr 1fr .7fr; gap: 16px; margin: 12px 0; }
    .lbl { font-size: 12px; color: var(--tz-muted); margin-bottom: 4px; }
    .small { font-size: 12px; }
    .big { font-size: 16px; }
    .right { text-align: right; }
    .actions { display: flex; gap: 8px; border-top: 1px solid var(--tz-border); padding-top: 12px; flex-wrap: wrap; }
    .bar-top { margin-bottom: 14px; flex-wrap: wrap; }
    .chip { border: 0; background: #f1f5f9; color: #475569; border-radius: 999px; padding: 7px 14px; cursor: pointer; font: inherit; }
    .chip.on { background: #dcfce7; color: #15803d; font-weight: 500; }
    tr.off td { opacity: .5; }
    .kpis { grid-template-columns: repeat(4, 1fr); margin-bottom: 16px; }
    .two { grid-template-columns: 1fr 1fr; }
    .pad { padding: 18px 20px; }
    .pad .between { margin-top: 12px; }
    .form { display: flex; flex-direction: column; gap: 4px; }
    .form label { font-size: 13px; color: #334155; margin-top: 8px; }
    .grow { flex: 1; display: flex; flex-direction: column; }
    @media (max-width: 900px) { .cols, .kpis, .two { grid-template-columns: 1fr 1fr; } }
  `,
})
export class ManagePage {
  private api = inject(ApiService);
  i18n = inject(I18nService);
  tab = 'orders';
  filter = 'active';
  filters = [
    { label: this.i18n.t('active'), value: 'active' },
    { label: this.i18n.t('st_delivered'), value: 'delivered' },
    { label: this.i18n.t('st_cancelled'), value: 'cancelled' },
  ];
  menu = signal<Menu | null>(null);
  orders = signal<Order[]>([]);
  stats = signal<RestaurantStats | null>(null);
  couriers = signal<CourierInfo[]>([]);
  category = signal<number | null>(null);
  activeCount = signal(0);
  dishes = computed(() => this.menu()?.dishes.filter((d) => d.categoryId === this.category()) ?? []);
  maxDay = computed(() => Math.max(1, ...(this.stats()?.revenueByDay.map((d) => d.value) ?? [1])));
  sev = statusSeverity;

  assignDialog = false; courierId: number | null = null; assignOrder: Order | null = null;
  dishDialog = false; dish: Partial<Dish> = {};
  catDialog = false; cat = { nameRu: '', nameTj: '' };

  constructor() {
    this.loadMenu();
    this.loadOrders();
    this.api.restaurantStats().subscribe((s) => this.stats.set(s));
    const sub = interval(20000).subscribe(() => this.loadOrders());   // периодическое обновление списка заказов
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  loadMenu() {
    this.api.manageMenu().subscribe({
      next: (m) => { this.menu.set(m); if (!this.category()) this.category.set(m.categories[0]?.id ?? null); },
      error: (e) => this.api.fail(e),
    });
  }

  loadOrders() {
    this.api.manageOrders(this.filter).subscribe({
      next: (o) => { this.orders.set(o); if (this.filter === 'active') this.activeCount.set(o.length); },
      error: (e) => this.api.fail(e),
    });
  }

  canAssign(o: Order) { return ['accepted', 'cooking', 'ready'].includes(o.status); }

  change(o: Order, s: OrderStatus) {
    let comment: string | undefined;
    if (s === 'cancelled') { comment = prompt(this.i18n.t('cancelReason')) ?? undefined; if (!comment) return; }
    this.api.changeStatus(o.id, s, comment).subscribe({ next: () => { this.loadOrders(); this.api.ok(this.i18n.t('st_' + s)); }, error: (e) => this.api.fail(e) });
  }

  openAssign(o: Order) {
    this.assignOrder = o;
    this.courierId = o.courier?.id ?? null;
    this.api.availableCouriers().subscribe((c) => { this.couriers.set(c); this.assignDialog = true; });
  }

  assign() {
    this.api.assignCourier(this.assignOrder!.id, this.courierId!).subscribe({
      next: () => { this.assignDialog = false; this.loadOrders(); }, error: (e) => this.api.fail(e),
    });
  }

  toggle(d: Dish, v: boolean) { this.api.setAvailability(d.id, v).subscribe({ next: () => this.loadMenu(), error: (e) => this.api.fail(e) }); }

  editDish(d?: Dish) {
    this.dish = d ? { ...d } : { categoryId: this.category() ?? undefined, isAvailable: true, price: 0 };
    this.dishDialog = true;
  }

  saveDish() {
    const body = { ...this.dish, nameTj: this.dish.nameTj || this.dish.nameRu, descriptionTj: this.dish.descriptionTj ?? this.dish.descriptionRu };
    const req = this.dish.id ? this.api.updateDish(this.dish.id, body) : this.api.addDish(body);
    req.subscribe({ next: () => { this.dishDialog = false; this.loadMenu(); this.api.ok(this.i18n.t('save')); }, error: (e) => this.api.fail(e) });
  }

  removeDish(d: Dish) {
    if (!confirm(`${this.i18n.t('delete')}: ${d.nameRu}?`)) return;
    this.api.deleteDish(d.id).subscribe({ next: () => this.loadMenu(), error: (e) => this.api.fail(e) });
  }

  saveCategory() {
    this.api.addCategory({ ...this.cat, sortOrder: this.menu()?.categories.length ?? 0 }).subscribe({
      next: () => { this.catDialog = false; this.cat = { nameRu: '', nameTj: '' }; this.loadMenu(); }, error: (e) => this.api.fail(e),
    });
  }

  pct(v: number, max: number) { return max ? Math.round((v / max) * 100) : 0; }
}
