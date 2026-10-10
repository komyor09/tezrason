import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ApiService } from '../../core/api.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';
import { AdminRestaurant, PlatformStats, User } from '../../core/models';
import { MoneyPipe, statusSeverity } from '../../core/ui';

type Section = 'restaurants' | 'users' | 'stats';

/** Панель суперадминистратора (рис. 2.15): модерация заведений, пользователи, статистика платформы. */
@Component({
  selector: 'app-admin',
  imports: [FormsModule, ButtonModule, TableModule, TagModule, DialogModule, InputTextModule, SelectModule, TranslatePipe, MoneyPipe],
  template: `
    <div class="shell">
      <aside class="side">
        @for (s of sections; track s.key) {
          <button [class.on]="section() === s.key" (click)="section.set(s.key)"><i [class]="'pi ' + s.icon"></i> {{ s.label | t }}</button>
        }
      </aside>
      <div class="content">
        @if (stats(); as st) {
          <div class="grid kpis">
            <div class="card kpi"><div class="label">{{ 'activeRestaurants' | t }}</div><div class="value">{{ st.activeRestaurants }}</div></div>
            <div class="card kpi"><div class="label">{{ 'pendingRestaurants' | t }}</div><div class="value warn">{{ st.pendingRestaurants }}</div></div>
            <div class="card kpi"><div class="label">{{ 'ordersToday' | t }}</div><div class="value">{{ st.ordersToday }}</div></div>
            <div class="card kpi"><div class="label">{{ 'couriersOnShift' | t }}</div><div class="value">{{ st.couriersOnShift }}</div></div>
          </div>
        }

        @switch (section()) {
          @case ('restaurants') {
            <div class="card">
              <div class="between pad"><b>{{ 'restaurants' | t }}</b></div>
              <p-table [value]="restaurants()" [tableStyle]="{ 'min-width': '760px' }">
                <ng-template #header><tr><th>{{ 'restaurant' | t }}</th><th>{{ 'administrator' | t }}</th><th>{{ 'plan' | t }}</th>
                  <th>{{ 'ordersMonth' | t }}</th><th>{{ 'status' | t }}</th><th>{{ 'action' | t }}</th></tr></ng-template>
                <ng-template #body let-r>
                  <tr>
                    <td><b>{{ r.name }}</b><div class="muted small">{{ r.cuisine }}</div></td>
                    <td>{{ r.ownerName }}<div class="muted small">{{ r.ownerPhone }}</div></td>
                    <td>{{ r.planName ?? '—' }}</td>
                    <td>{{ r.ordersMonth }}</td>
                    <td><p-tag [value]="'rs_' + r.status | t" [severity]="sev(r.status)" /></td>
                    <td>
                      @switch (r.status) {
                        @case ('pending') { <p-button [label]="'activate' | t" size="small" (onClick)="setStatus(r, 'active')" /> }
                        @case ('active') { <p-button [label]="'block' | t" size="small" severity="danger" [text]="true" (onClick)="setStatus(r, 'blocked')" /> }
                        @case ('blocked') { <p-button [label]="'restore' | t" size="small" [text]="true" (onClick)="setStatus(r, 'active')" /> }
                      }
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          }
          @case ('users') {
            <div class="card">
              <div class="between pad"><b>{{ 'users' | t }}</b><p-button [label]="'addCourier' | t" icon="pi pi-plus" size="small" (onClick)="courierDialog = true" /></div>
              <p-table [value]="users()" [paginator]="true" [rows]="10" [tableStyle]="{ 'min-width': '640px' }">
                <ng-template #header><tr><th>{{ 'fullName' | t }}</th><th>{{ 'phone' | t }}</th><th>{{ 'role' | t }}</th><th>{{ 'status' | t }}</th><th></th></tr></ng-template>
                <ng-template #body let-u>
                  <tr>
                    <td>{{ u.fullName }}</td><td>{{ u.phone }}</td><td>{{ 'r_' + u.role | t }}</td>
                    <td><p-tag [value]="(u.isActive ? 'rs_active' : 'blocked') | t" [severity]="u.isActive ? 'success' : 'danger'" /></td>
                    <td>@if (u.role !== 'super_admin') {
                      <p-button [label]="(u.isActive ? 'block' : 'restore') | t" size="small" [text]="true" [severity]="u.isActive ? 'danger' : 'primary'" (onClick)="toggleUser(u)" /> }</td>
                  </tr>
                </ng-template>
              </p-table>
            </div>
          }
          @case ('stats') {
            @if (stats(); as st) {
              <div class="grid two">
                <div class="card pad">
                  <div class="section-title">{{ 'stats' | t }}</div>
                  <div class="between line"><span>{{ 'ordersTotal' | t }}</span><b>{{ st.ordersTotal }}</b></div>
                  <div class="between line"><span>{{ 'revenueTotal' | t }}</span><b class="green">{{ st.revenueTotal | money }}</b></div>
                  <div class="between line"><span>{{ 'clients' | t }}</span><b>{{ st.clients }}</b></div>
                  <div class="between line"><span>{{ 'couriersOnShift' | t }}</span><b>{{ st.couriersOnShift }} / {{ st.couriers }}</b></div>
                </div>
                <div class="card pad">
                  <div class="section-title">{{ 'orders' | t }}</div>
                  @for (s of st.ordersByStatus; track s.name) {
                    <div class="between small line"><span>{{ 'st_' + s.name | t }}</span><span>{{ s.value }}</span></div>
                    <div class="bar"><div [style.width.%]="st.ordersTotal ? (s.value / st.ordersTotal) * 100 : 0"></div></div>
                  }
                </div>
              </div>
            }
          }
        }
      </div>
    </div>

    <p-dialog [header]="'addCourier' | t" [(visible)]="courierDialog" [modal]="true" [style]="{ width: '420px' }">
      <div class="form">
        <label>{{ 'fullName' | t }}</label><input pInputText [(ngModel)]="courier.fullName" />
        <label>{{ 'phone' | t }}</label><input pInputText [(ngModel)]="courier.phone" />
        <label>{{ 'password' | t }}</label><input pInputText [(ngModel)]="courier.password" />
        <label>{{ 'transport' | t }}</label>
        <p-select [options]="transports" [(ngModel)]="courier.transportType" optionLabel="label" optionValue="value" appendTo="body" />
      </div>
      <ng-template #footer><p-button [label]="'save' | t" (onClick)="createCourier()" /></ng-template>
    </p-dialog>
  `,
  styles: `
    .shell { display: grid; grid-template-columns: 230px 1fr; min-height: calc(100vh - 68px); }
    .side { background: #fff; border-right: 1px solid var(--tz-border); padding: 18px 12px; display: flex; flex-direction: column; gap: 4px; }
    .side button { text-align: left; border: 0; background: none; padding: 10px 14px; border-radius: 8px; color: #475569; cursor: pointer; font: inherit; display: flex; gap: 10px; align-items: center; }
    .side button.on { background: #ecfdf5; color: #047857; font-weight: 500; }
    .content { padding: 24px 32px; display: flex; flex-direction: column; gap: 20px; }
    .kpis { grid-template-columns: repeat(4, 1fr); }
    .warn { color: #b45309; }
    .pad { padding: 16px 18px; }
    .small { font-size: 12px; }
    .two { grid-template-columns: 1fr 1fr; }
    .line { margin: 10px 0; }
    .form { display: flex; flex-direction: column; gap: 4px; }
    .form label { font-size: 13px; margin-top: 8px; }
    @media (max-width: 900px) { .shell { grid-template-columns: 1fr; } .side { flex-direction: row; overflow-x: auto; } .kpis, .two { grid-template-columns: 1fr 1fr; } .content { padding: 16px; } }
  `,
})
export class AdminPage {
  private api = inject(ApiService);
  private i18n = inject(I18nService);
  section = signal<Section>('restaurants');
  sections: { key: Section; label: string; icon: string }[] = [
    { key: 'restaurants', label: 'restaurants', icon: 'pi-shop' },
    { key: 'users', label: 'users', icon: 'pi-users' },
    { key: 'stats', label: 'stats', icon: 'pi-chart-bar' },
  ];
  stats = signal<PlatformStats | null>(null);
  restaurants = signal<AdminRestaurant[]>([]);
  users = signal<User[]>([]);
  sev = statusSeverity;
  courierDialog = false;
  courier = { fullName: '', phone: '+992', password: '', transportType: 'scooter' };
  transports = ['foot', 'bicycle', 'scooter', 'car'].map((v) => ({ value: v, label: this.i18n.t('tr_' + v) }));

  constructor() { this.load(); }

  load() {
    this.api.platformStats().subscribe((s) => this.stats.set(s));
    this.api.adminRestaurants().subscribe((r) => this.restaurants.set(r));
    this.api.users().subscribe((u) => this.users.set(u));
  }

  setStatus(r: AdminRestaurant, status: string) {
    this.api.setRestaurantStatus(r.id, status).subscribe({ next: () => { this.load(); this.api.ok(r.name); }, error: (e) => this.api.fail(e) });
  }

  toggleUser(u: User) { this.api.setUserActive(u.id, !u.isActive).subscribe({ next: () => this.load(), error: (e) => this.api.fail(e) }); }

  createCourier() {
    this.api.createCourier(this.courier).subscribe({
      next: () => { this.courierDialog = false; this.courier = { fullName: '', phone: '+992', password: '', transportType: 'scooter' }; this.load(); },
      error: (e) => this.api.fail(e),
    });
  }
}
