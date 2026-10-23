import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiService } from '../../core/api.service';
import { CartService } from '../../core/cart.service';
import { ContentService, LText } from '../../core/content.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';
import { Dish, Restaurant } from '../../core/models';
import { MoneyPipe } from '../../core/ui';

/** Группы блюд для витрины: определяются по имени фотографии блюда (/img/photos/dishes/{key}.jpg). */
const PH = '/img/photos/dishes/';
const GROUPS: { key: string; img: string; items: string[] }[] = [
  { key: 'catNational', img: PH + 'plov-osh.jpg', items: ['plov-osh', 'plov-fergana', 'plov-wedding', 'shurbo', 'manti', 'lagman', 'kabob-lamb', 'shashlik-chicken', 'lula-kebab'] },
  { key: 'catPizza', img: PH + 'margherita.jpg', items: ['margherita', 'pepperoni', 'quattro-formaggi', 'carbonara'] },
  { key: 'catSushi', img: PH + 'california.jpg', items: ['philadelphia', 'california', 'miso'] },
  { key: 'catBurgers', img: '/img/photos/covers/burger.jpg', items: ['burger'] },
  { key: 'catSalads', img: PH + 'achichuk.jpg', items: ['achichuk'] },
  { key: 'catBakery', img: PH + 'samsa.jpg', items: ['samsa', 'non'] },
  { key: 'catDrinks', img: PH + 'lemonade.jpg', items: ['green-tea', 'kompot', 'lemonade'] },
];
const keyOf = (url?: string) => (url ?? '').split('/').pop()?.split('.')[0] ?? '';

interface Showcase { dish: Dish; restaurant: Restaurant; group: string; }

/** Главная страница клиента (лендинг): герой-блок, преимущества, витрина блюд, заведения, шаги заказа, партнёрам. */
@Component({
  selector: 'app-restaurants',
  imports: [FormsModule, RouterLink, DecimalPipe, ButtonModule, InputTextModule, IconFieldModule, InputIconModule, TagModule, SkeletonModule, TranslatePipe, MoneyPipe],
  template: `
    <!-- ===== Герой ===== -->
    <section class="hero">
      <div class="wrap hero-grid">
        <div class="hero-text">
          <span class="pill"><i class="pi pi-bolt"></i> {{ 'heroBadge' | t }}</span>
          <h1>{{ 'heroL1' | t }}<br /><span class="accent">{{ 'heroL2' | t }}</span><br />{{ 'heroL3' | t }}</h1>
          <p class="lead">{{ 'heroText' | t }}</p>
          <div class="cta">
            <p-button [label]="'orderNow' | t" icon="pi pi-arrow-right" iconPos="right" [rounded]="true" size="large" (onClick)="scrollTo('dishes')" />
            <a routerLink="/help" class="watch"><span class="play"><i class="pi pi-play"></i></span>{{ 'watchVideo' | t }}</a>
          </div>
          <div class="proof">
            <div class="faces">
              @for (r of restaurants().slice(0, 4); track r.id) { <img [src]="r.logoUrl" alt="" /> }
            </div>
            <div>
              <b>{{ restaurants().length }} {{ 'statRestaurants' | t }}</b>
              <div class="stars"><i class="pi pi-star-fill"></i><i class="pi pi-star-fill"></i><i class="pi pi-star-fill"></i><i class="pi pi-star-fill"></i><i class="pi pi-star-fill"></i>
                <span class="muted">({{ avgRating() | number: '1.1-1' }} — {{ 'statRating' | t }})</span></div>
            </div>
          </div>
        </div>

        <div class="visual">
          <div class="blob"></div>
          <span class="dot d1"></span><span class="dot d2"></span><span class="dot d3"></span>
          <i class="pi pi-heart-fill float heart"></i>
          <img class="courier" src="/img/ui/hero-courier.svg" alt="" />
          <div class="fcard f-time float">
            <span class="ic"><i class="pi pi-clock"></i></span>
            <div><small>{{ 'deliveryTime' | t }}</small><b>30–50 {{ 'min' | t }}</b></div>
          </div>
          <div class="fcard f-ok float slow">
            <span class="ic ok"><i class="pi pi-check"></i></span>
            <b>{{ 'orderAccepted' | t }}</b>
          </div>
          <div class="fcard f-pay float">
            <img src="/img/photos/dishes/plov-osh.jpg" alt="" />
            <div><b class="accent">{{ 'payOnDelivery' | t }}</b><small>{{ 'cashOrCard' | t }}</small></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Почему мы ===== -->
    <section class="wrap why">
      <div class="eyebrow center">• {{ 'whyUs' | t }} •</div>
      <h2 class="h2 center">{{ 'whyTitle' | t }}</h2>
      <div class="why-grid">
        @for (f of features; track f.t) {
          <div class="why-item">
            <span class="why-ic" [style.background]="f.bg"><i [class]="'pi ' + f.icon" [style.color]="f.color"></i></span>
            <b>{{ f.t | t }}</b>
            <p class="muted">{{ f.d | t }}</p>
          </div>
        }
      </div>
    </section>

    <!-- ===== Витрина блюд ===== -->
    <section class="wrap dishes" id="dishes">
      <div class="between">
        <div>
          <div class="eyebrow">{{ 'exploreMenu' | t }}</div>
          <h2 class="h2">{{ 'menuTitle' | t }}</h2>
        </div>
        <div class="arrows">
          <button class="arr" (click)="slide(-1)" aria-label="prev"><i class="pi pi-chevron-left"></i></button>
          <button class="arr on" (click)="slide(1)" aria-label="next"><i class="pi pi-chevron-right"></i></button>
        </div>
      </div>
      <div class="dish-grid">
        <aside class="cats">
          <button [class.on]="group() === ''" (click)="group.set('')"><span class="ci all"><i class="pi pi-th-large"></i></span>{{ 'catAll' | t }}</button>
          @for (g of groups; track g.key) {
            <button [class.on]="group() === g.key" (click)="group.set(g.key)"><img class="ci" [src]="g.img" alt="" />{{ g.key | t }}</button>
          }
        </aside>
        <div class="track" #track>
          @for (s of shown(); track s.dish.id) {
            <article class="dcard">
              <img [src]="s.dish.imageUrl" [alt]="i18n.pick(s.dish, 'name')" />
              <button class="fav" [class.on]="favs().has(s.dish.id)" (click)="toggleFav(s.dish.id)" aria-label="fav"><i class="pi" [class.pi-heart-fill]="favs().has(s.dish.id)" [class.pi-heart]="!favs().has(s.dish.id)"></i></button>
              <div class="dinfo">
                <b>{{ i18n.pick(s.dish, 'name') }}</b>
                <a class="rname" [routerLink]="['/restaurant', s.restaurant.id]"><i class="pi pi-star-fill"></i> {{ s.restaurant.rating | number: '1.1-1' }} · {{ s.restaurant.name }}</a>
                <div class="between">
                  <span class="price">{{ s.dish.price | money }}</span>
                  <button class="add" (click)="add(s)">{{ 'toCart' | t }}</button>
                </div>
              </div>
            </article>
          } @empty {
            @for (i of [1, 2, 3]; track i) { <p-skeleton width="250px" height="320px" borderRadius="18px" /> }
          }
        </div>
      </div>
    </section>

    <!-- ===== Заведения ===== -->
    <section class="wrap" id="restaurants">
      <div class="between head">
        <div>
          <div class="eyebrow">{{ 'restaurants' | t }}</div>
          <h2 class="h2">{{ 'cityRestaurants' | t }}</h2>
        </div>
        <p-iconfield class="search">
          <p-inputicon class="pi pi-search" />
          <input pInputText [(ngModel)]="query" (ngModelChange)="load()" [placeholder]="'search' | t" />
        </p-iconfield>
      </div>
      <div class="list">
        @for (r of restaurants(); track r.id) {
          <a class="item" [routerLink]="['/restaurant', r.id]">
            <div class="cover-wrap">
              <img class="cover" [src]="r.logoUrl || '/img/covers/chaikhona.svg'" [alt]="r.name" />
              <p-tag class="state" [value]="(r.isOpenNow ? 'open' : 'closed') | t" [severity]="r.isOpenNow ? 'success' : 'secondary'" />
            </div>
            <div class="body">
              <b class="name">{{ r.name }}</b>
              <div class="muted cuisine">{{ r.cuisine }}</div>
              <div class="muted desc">{{ i18n.pick(r, 'description') }}</div>
              <div class="row meta">
                <span><i class="pi pi-star-fill star"></i> {{ r.rating | number: '1.1-1' }}</span>
                <span><i class="pi pi-clock"></i> {{ r.avgCookingMin }}–{{ r.avgCookingMin + 15 }} {{ 'min' | t }}</span>
                <span><i class="pi pi-truck"></i> {{ r.deliveryFee | money }}</span>
              </div>
              <span class="go">{{ 'menu' | t }} <i class="pi pi-arrow-right"></i></span>
            </div>
          </a>
        } @empty {
          @if (loading()) {
            @for (i of [1, 2, 3]; track i) { <p-skeleton height="330px" borderRadius="18px" /> }
          } @else { <div class="empty">—</div> }
        }
      </div>
    </section>

    <!-- ===== Как это работает ===== -->
    <section class="wrap how">
      <div class="how-visual">
        <div class="how-circle"></div>
        <img src="/img/ui/step4.svg" alt="" class="how-img" />
        <div class="fcard how-badge"><span class="ic"><i class="pi pi-map-marker"></i></span><div><small>{{ 'trackOrder' | t }}</small><b>{{ 'trackOnline' | t }}</b></div></div>
      </div>
      <div>
        <div class="eyebrow">{{ 'howWorks' | t }}</div>
        <h2 class="h2">{{ 'howTitle' | t }}</h2>
        <ol class="steps">
          @for (s of steps(); track $index) {
            <li><span class="n">{{ $index + 1 }}</span><div><b>{{ c.tr(s.h) }}</b><p class="muted">{{ c.tr(s.p) }}</p></div></li>
          }
        </ol>
      </div>
    </section>

    <!-- ===== Партнёрам ===== -->
    <section class="wrap">
      <div class="partner">
        <div class="p-text">
          <div class="eyebrow">{{ 'partnerEyebrow' | t }}</div>
          <h2 class="h2">{{ 'partnerTitle' | t }}</h2>
          <p class="muted">{{ 'partnerText' | t }}</p>
          <div class="cta">
            <a routerLink="/partners"><p-button [label]="'becomePartner' | t" icon="pi pi-arrow-right" iconPos="right" [rounded]="true" /></a>
            <a routerLink="/courier-rules"><p-button [label]="'becomeCourier' | t" icon="pi pi-car" [rounded]="true" [outlined]="true" /></a>
          </div>
        </div>
        <div class="p-logo"><img src="/img/ui/logo.svg" alt="" /><b>TezRason</b></div>
        <div class="phone">
          <div class="screen">
            <div class="ph-head"><img src="/img/ui/logo.svg" alt="" /><b>TezRason</b></div>
            <div class="ph-hero"><b>{{ 'heroL1' | t }} {{ 'heroL2' | t }}</b><img src="/img/ui/hero-courier.svg" alt="" /></div>
            <div class="ph-cats">@for (g of groups.slice(0, 4); track g.key) { <img [src]="g.img" alt="" /> }</div>
            <div class="ph-list">@for (r of restaurants().slice(0, 2); track r.id) { <img [src]="r.logoUrl" alt="" /> }</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Полоса преимуществ ===== -->
    <section class="wrap strip">
      @for (s of strip; track s.t) {
        <div class="strip-item"><span class="s-ic"><i [class]="'pi ' + s.icon"></i></span><div><b>{{ s.t | t }}</b><small class="muted">{{ s.d | t }}</small></div></div>
      }
    </section>
  `,
  styles: `
    :host { display: block; --soft: #ecfdf5; --soft2: #d1fae5; }
    .wrap { max-width: 1160px; margin: 0 auto; padding-left: 16px; padding-right: 16px; }
    .center { text-align: center; }
    .accent { color: var(--tz-primary); }
    .eyebrow { color: var(--tz-primary); font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 6px; }
    .h2 { font-size: 30px; line-height: 1.2; margin: 0 0 24px; font-weight: 700; }
    section { padding-top: 80px; }

    /* Герой */
    .hero { background: radial-gradient(1200px 500px at 85% 20%, #ecfdf5 0%, #f8fafc 60%); padding: 40px 0 24px; overflow: hidden; }
    .hero-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 24px; align-items: center; }
    .pill { display: inline-flex; gap: 6px; align-items: center; background: var(--soft2); color: var(--tz-primary-dark); font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 999px; }
    h1 { font-size: 54px; line-height: 1.08; letter-spacing: -.02em; margin: 18px 0 18px; font-weight: 800; }
    .lead { font-size: 17px; line-height: 1.6; color: #475569; max-width: 480px; margin: 0 0 28px; }
    .cta { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
    .watch { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; }
    .play { width: 42px; height: 42px; border-radius: 50%; border: 2px solid var(--tz-text); display: grid; place-items: center; font-size: 13px; }
    .watch:hover .play { background: var(--tz-primary); border-color: var(--tz-primary); color: #fff; }
    .proof { display: flex; align-items: center; gap: 14px; margin-top: 34px; }
    .faces { display: flex; }
    .faces img { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; margin-left: -10px; box-shadow: 0 2px 6px rgba(15,23,42,.12); }
    .faces img:first-child { margin-left: 0; }
    .stars { color: #f59e0b; font-size: 12px; display: flex; gap: 3px; align-items: center; margin-top: 3px; }
    .stars .muted { margin-left: 6px; font-size: 13px; }

    .visual { position: relative; height: 500px; }
    .blob { position: absolute; width: 430px; height: 430px; right: 30px; top: 30px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #a7f3d0, #34d399 70%); opacity: .55; }
    .courier { position: absolute; width: 470px; right: 10px; top: 40px; }
    .dot { position: absolute; border-radius: 50%; background: var(--tz-primary); }
    .d1 { width: 10px; height: 10px; left: 40px; top: 70px; } .d2 { width: 7px; height: 7px; right: 6px; top: 220px; background: #f59e0b; } .d3 { width: 12px; height: 12px; left: 90px; bottom: 50px; opacity: .4; }
    .heart { position: absolute; right: 18px; top: 40px; width: 52px; height: 52px; border-radius: 50%; background: #fff; color: #ef4444; display: grid; place-items: center; font-size: 20px; box-shadow: 0 10px 24px rgba(15,23,42,.12); }
    .fcard { position: absolute; display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 16px; padding: 12px 16px; box-shadow: 0 14px 34px rgba(15,23,42,.12); }
    .fcard small { display: block; color: var(--tz-muted); font-size: 12px; }
    .fcard b { font-size: 14px; }
    .fcard .ic { width: 38px; height: 38px; border-radius: 50%; background: var(--soft2); color: var(--tz-primary); display: grid; place-items: center; }
    .fcard .ic.ok { background: var(--tz-primary); color: #fff; }
    .f-time { left: 0; top: 150px; }
    .f-ok { right: 70px; top: 0; }
    .f-pay { right: 0; bottom: 20px; }
    .f-pay img { width: 54px; height: 54px; border-radius: 12px; background: #fef3c7; object-fit: cover; }
    .f-pay b { display: block; }
    .float { animation: float 4s ease-in-out infinite; }
    .float.slow { animation-duration: 5.5s; }
    @keyframes float { 50% { transform: translateY(-8px); } }

    /* Почему мы */
    .why-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
    .why-item { text-align: center; padding: 8px 28px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .why-item + .why-item { border-left: 1px solid var(--tz-border); }
    .why-ic { width: 84px; height: 84px; border-radius: 26px; display: grid; place-items: center; margin-bottom: 6px; }
    .why-ic i { font-size: 34px; }
    .why-item b { font-size: 17px; }
    .why-item p { margin: 0; line-height: 1.55; max-width: 260px; }

    /* Витрина */
    .arrows { display: flex; gap: 10px; }
    .arr { width: 42px; height: 42px; border-radius: 50%; border: none; background: #fff; box-shadow: 0 4px 14px rgba(15,23,42,.1); cursor: pointer; color: var(--tz-text); }
    .arr.on { background: var(--tz-primary); color: #fff; }
    .dish-grid { display: grid; grid-template-columns: 200px 1fr; gap: 20px; }
    .cats { display: flex; flex-direction: column; gap: 4px; border-right: 1px solid var(--tz-border); padding-right: 16px; }
    .cats button { display: flex; align-items: center; gap: 12px; border: none; background: none; font: inherit; font-size: 14px; padding: 9px 12px; border-radius: 14px; cursor: pointer; text-align: left; color: #334155; }
    .cats button:hover { background: var(--soft); }
    .cats button.on { background: var(--tz-primary); color: #fff; font-weight: 600; box-shadow: 0 8px 18px rgba(5,150,105,.28); }
    .ci { width: 28px; height: 28px; border-radius: 8px; object-fit: cover; background: #fff; }
    .ci.all { display: grid; place-items: center; background: rgba(255,255,255,.25); }
    .track { display: flex; gap: 18px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; padding-bottom: 8px; scrollbar-width: none; }
    .track::-webkit-scrollbar { display: none; }
    .dcard { position: relative; flex: 0 0 250px; height: 330px; border-radius: 20px; overflow: hidden; scroll-snap-align: start; background: #1f2937; }
    .dcard > img { width: 100%; height: 100%; object-fit: cover; transition: transform .4s; }
    .dcard:hover > img { transform: scale(1.06); }
    .dcard::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,23,42,0) 35%, rgba(15,23,42,.88) 100%); pointer-events: none; }
    .fav { position: absolute; top: 12px; right: 12px; z-index: 2; width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.9); background: rgba(15,23,42,.25); color: #fff; cursor: pointer; }
    .fav.on { background: #fff; color: #ef4444; }
    .dinfo { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2; padding: 16px; color: #fff; display: flex; flex-direction: column; gap: 6px; }
    .dinfo > b { font-size: 17px; }
    .rname { font-size: 12px; color: #e2e8f0; }
    .rname i { color: #fbbf24; font-size: 11px; }
    .price { font-size: 20px; font-weight: 700; }
    .add { border: none; background: var(--tz-primary); color: #fff; font: inherit; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 10px; cursor: pointer; }
    .add:hover { background: var(--tz-primary-dark); }

    /* Заведения */
    .head { flex-wrap: wrap; align-items: flex-end; }
    .head .h2 { margin-bottom: 20px; }
    .search { margin-bottom: 20px; }
    .search input { width: 320px; border-radius: 999px; }
    .list { display: grid; gap: 22px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
    .item { background: #fff; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 2px 10px rgba(15,23,42,.06); transition: box-shadow .2s, transform .2s; }
    .item:hover { box-shadow: 0 16px 34px rgba(15,23,42,.12); transform: translateY(-4px); }
    .cover-wrap { position: relative; }
    .cover { height: 170px; width: 100%; object-fit: cover; display: block; }
    .state { position: absolute; top: 12px; left: 12px; }
    .body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .name { font-size: 17px; }
    .cuisine, .desc { font-size: 13px; }
    .desc { min-height: 34px; }
    .meta { font-size: 13px; color: #475569; margin: 4px 0 6px; gap: 14px; }
    .star { color: #f59e0b; }
    .go { color: var(--tz-primary); font-weight: 600; margin-top: auto; display: inline-flex; gap: 6px; align-items: center; }

    /* Как это работает */
    .how { display: grid; grid-template-columns: 1fr 1.1fr; gap: 48px; align-items: center; }
    .how-visual { position: relative; height: 380px; }
    .how-circle { position: absolute; left: 30px; top: 10px; width: 360px; height: 360px; border-radius: 50%; background: linear-gradient(135deg, #34d399, #059669); }
    .how-img { position: absolute; left: 40px; top: 90px; width: 340px; border-radius: 20px; background: #fff; box-shadow: 0 20px 40px rgba(15,23,42,.18); }
    .how-badge { right: 0; bottom: 20px; }
    .steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 18px; }
    .steps li { display: flex; gap: 16px; }
    .steps .n { flex: 0 0 40px; height: 40px; border-radius: 50%; background: var(--soft2); color: var(--tz-primary-dark); font-weight: 700; display: grid; place-items: center; }
    .steps b { font-size: 16px; }
    .steps p { margin: 4px 0 0; line-height: 1.55; }

    /* Партнёрам */
    .partner { position: relative; background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 28px; padding: 44px 48px; display: grid; grid-template-columns: 1.2fr .7fr .9fr; gap: 24px; align-items: center; overflow: hidden; min-height: 330px; }
    .p-text .h2 { margin-bottom: 12px; }
    .p-text p { line-height: 1.6; margin: 0 0 22px; max-width: 420px; }
    .p-logo { justify-self: center; width: 140px; height: 150px; border-radius: 30px; background: #fff; color: var(--tz-primary); font-size: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 18px 36px rgba(5,150,105,.25); transform: rotate(-6deg); }
    .p-logo img { width: 76px; }
    .phone { justify-self: center; width: 210px; height: 380px; border-radius: 34px; background: #0f172a; padding: 9px; transform: rotate(8deg) translateY(50px); box-shadow: 0 24px 48px rgba(15,23,42,.3); }
    .screen { width: 100%; height: 100%; border-radius: 26px; background: #f8fafc; overflow: hidden; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .ph-head { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--tz-primary); }
    .ph-head img { width: 20px; }
    .ph-hero { background: var(--tz-primary); color: #fff; border-radius: 14px; padding: 10px; font-size: 11px; display: flex; align-items: center; gap: 4px; }
    .ph-hero img { width: 70px; }
    .ph-cats { display: flex; justify-content: space-between; }
    .ph-cats img { width: 38px; height: 38px; border-radius: 10px; background: #fff; box-shadow: 0 2px 6px rgba(15,23,42,.08); }
    .ph-list { display: flex; flex-direction: column; gap: 8px; }
    .ph-list img { width: 100%; height: 74px; object-fit: cover; border-radius: 12px; }

    /* Полоса преимуществ */
    .strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding-top: 48px; }
    .strip-item { display: flex; align-items: center; gap: 12px; }
    .strip-item b { display: block; font-size: 14px; }
    .strip-item small { font-size: 12px; }
    .s-ic { width: 46px; height: 46px; border-radius: 14px; background: var(--soft2); color: var(--tz-primary); display: grid; place-items: center; font-size: 18px; }

    @media (max-width: 1024px) {
      h1 { font-size: 42px; }
      .partner { grid-template-columns: 1fr 1fr; } .p-logo { display: none; }
    }
    @media (max-width: 768px) {
      section { padding-top: 52px; }
      .hero { padding-top: 24px; }
      .hero-grid, .how { grid-template-columns: 1fr; }
      h1 { font-size: 34px; }
      .h2 { font-size: 24px; }
      .visual { height: 360px; }
      .blob { width: 300px; height: 300px; right: 10%; }
      .courier { width: 330px; right: 50%; transform: translateX(50%); }
      .f-ok { right: 10px; } .f-time { top: 120px; } .heart { display: none; }
      .why-grid { grid-template-columns: 1fr; gap: 24px; }
      .why-item + .why-item { border-left: none; }
      .dish-grid { grid-template-columns: 1fr; }
      .cats { flex-direction: row; overflow-x: auto; border-right: none; padding-right: 0; scrollbar-width: none; }
      .cats button { flex: 0 0 auto; }
      .arrows { display: none; }
      .search, .search input { width: 100%; }
      .how-visual { height: 300px; } .how-circle { width: 270px; height: 270px; } .how-img { width: 260px; top: 70px; }
      .partner { grid-template-columns: 1fr; padding: 28px 22px; } .phone { display: none; }
      .strip { grid-template-columns: 1fr 1fr; }
    }
  `,
})
export class RestaurantsPage {
  private api = inject(ApiService);
  private cart = inject(CartService);
  i18n = inject(I18nService);
  c = inject(ContentService);
  private track = viewChild<ElementRef<HTMLElement>>('track');

  restaurants = signal<Restaurant[]>([]);
  loading = signal(true);
  query = '';
  showcase = signal<Showcase[]>([]);
  group = signal('');
  favs = signal(new Set<number>());
  groups = GROUPS;
  private help = toSignal(this.c.load<{ steps: { h: LText; p: LText }[] }>('help'));
  steps = computed(() => this.help()?.steps ?? []);

  avgRating = computed(() => {
    const r = this.restaurants();
    return r.length ? r.reduce((s, x) => s + x.rating, 0) / r.length : 0;
  });
  shown = computed(() => (this.group() ? this.showcase().filter((s) => s.group === this.group()) : this.showcase()));

  features = [
    { icon: 'pi-truck', bg: '#d1fae5', color: '#059669', t: 'f1t', d: 'f1d' },
    { icon: 'pi-th-large', bg: '#fef3c7', color: '#d97706', t: 'f2t', d: 'f2d' },
    { icon: 'pi-verified', bg: '#e0f2fe', color: '#0284c7', t: 'f3t', d: 'f3d' },
  ];
  strip = [
    { icon: 'pi-wallet', t: 'payOnDelivery', d: 'cashOrCard' },
    { icon: 'pi-map-marker', t: 'trackOrder', d: 'trackOnline' },
    { icon: 'pi-globe', t: 'twoLangs', d: 'twoLangsSub' },
    { icon: 'pi-headphones', t: 'support', d: 'supportSub' },
  ];

  constructor() {
    this.load();
    this.loadShowcase();
  }

  load() {
    this.api.restaurants(this.query).subscribe({
      next: (r) => { this.restaurants.set(r); this.loading.set(false); },
      error: (e) => { this.loading.set(false); this.api.fail(e); },
    });
  }

  /** Витрина: доступные блюда всех открытых заведений, сгруппированные по видам. */
  private loadShowcase() {
    this.api.restaurants().subscribe((rs) => {
      if (!rs.length) return;
      forkJoin(rs.map((r) => this.api.menu(r.id))).subscribe((menus) => {
        const list: (Showcase & { pos: number })[] = [];
        for (const m of menus) {
          m.dishes.filter((x) => x.isAvailable && x.imageUrl).forEach((d, pos) => {
            const g = GROUPS.find((x) => x.items.includes(keyOf(d.imageUrl)));
            list.push({ dish: d, restaurant: m.restaurant, group: g?.key ?? '', pos });
          });
        }
        // чередуем заведения, чтобы витрина начиналась с разнообразных блюд
        this.showcase.set(list.sort((a, b) => a.pos - b.pos));
      });
    });
  }

  slide(dir: number) { this.track()?.nativeElement.scrollBy({ left: dir * 540, behavior: 'smooth' }); }
  scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }
  toggleFav(id: number) { const s = new Set(this.favs()); s.has(id) ? s.delete(id) : s.add(id); this.favs.set(s); }
  add(s: Showcase) { this.cart.add(s.restaurant, s.dish); this.api.ok(this.i18n.t('addedToCart')); }
}
