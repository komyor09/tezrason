import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiService } from '../../core/api.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';
import { Restaurant } from '../../core/models';
import { MoneyPipe } from '../../core/ui';

/** Главная страница клиента: список активных заведений с поиском. */
@Component({
  selector: 'app-restaurants',
  imports: [FormsModule, RouterLink, DecimalPipe, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TagModule, SkeletonModule, TranslatePipe, MoneyPipe],
  template: `
    <div class="container">
      <div class="between head">
        <h1 class="page-title">{{ 'restaurants' | t }}</h1>
        <p-iconfield class="search">
          <p-inputicon class="pi pi-search" />
          <input pInputText [(ngModel)]="query" (ngModelChange)="load()" [placeholder]="'search' | t" />
        </p-iconfield>
      </div>

      <div class="grid list">
        @for (r of restaurants(); track r.id) {
          <a class="card item" [routerLink]="['/restaurant', r.id]">
            <div class="ph cover"><i class="pi pi-shop"></i></div>
            <div class="body">
              <div class="between"><b class="name">{{ r.name }}</b>
                <p-tag [value]="(r.isOpenNow ? 'open' : 'closed') | t" [severity]="r.isOpenNow ? 'success' : 'secondary'" />
              </div>
              <div class="muted cuisine">{{ r.cuisine }}</div>
              <div class="muted desc">{{ i18n.pick(r, 'description') }}</div>
              <div class="row meta">
                <span><i class="pi pi-star-fill star"></i> {{ r.rating | number: '1.1-1' }}</span>
                <span><i class="pi pi-clock"></i> {{ r.avgCookingMin }}–{{ r.avgCookingMin + 15 }} {{ 'min' | t }}</span>
                <span><i class="pi pi-truck"></i> {{ r.deliveryFee | money }}</span>
              </div>
              <p-button [label]="'menu' | t" [style]="{ width: '100%' }" />
            </div>
          </a>
        } @empty {
          @if (loading()) {
            @for (i of [1, 2, 3]; track i) { <p-skeleton height="330px" borderRadius="12px" /> }
          } @else { <div class="empty">—</div> }
        }
      </div>
    </div>
  `,
  styles: `
    .head { flex-wrap: wrap; }
    .search input { width: 320px; }
    .list { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    .item { overflow: hidden; display: flex; flex-direction: column; transition: box-shadow .15s, transform .15s; }
    .item:hover { box-shadow: 0 6px 18px rgba(15, 23, 42, .1); transform: translateY(-2px); }
    .cover { height: 140px; }
    .body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .name { font-size: 16px; }
    .cuisine { font-size: 12px; }
    .desc { font-size: 12px; min-height: 32px; }
    .meta { font-size: 12px; color: #475569; margin: 4px 0 8px; gap: 14px; }
    .star { color: #f59e0b; }
    @media (max-width: 768px) { .search, .search input { width: 100%; } }
  `,
})
export class RestaurantsPage {
  private api = inject(ApiService);
  i18n = inject(I18nService);
  restaurants = signal<Restaurant[]>([]);
  loading = signal(true);
  query = '';

  constructor() { this.load(); }

  load() {
    this.api.restaurants(this.query).subscribe({
      next: (r) => { this.restaurants.set(r); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.api.fail(e); },
    });
  }
}
