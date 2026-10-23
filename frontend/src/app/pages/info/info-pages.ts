import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ContentDoc, ContentService, LText } from '../../core/content.service';
import { I18nService, TranslatePipe } from '../../core/i18n.service';

const PAGE_STYLES = `
  .page { max-width: 900px; }
  .doc { padding: 32px 36px; }
  h1 { font-size: 26px; margin: 0 0 10px; }
  .lead { color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 18px; }
  h2 { font-size: 17px; margin: 24px 0 8px; }
  p, li { line-height: 1.65; color: #1e293b; }
  ul { padding-left: 20px; margin: 6px 0; }
  .note { background: #fef9c3; color: #854d0e; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; }
  .toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 8px; }
  .toc a { background: #f1f5f9; border-radius: 999px; padding: 5px 12px; font-size: 12px; color: #475569; }
  .muted { color: var(--tz-muted); }
  @media (max-width: 768px) { .doc { padding: 20px 16px; } }
`;

// =====================================================================
// Универсальная страница документа: соглашение, политика, правила курьеров, условия для заведений
// =====================================================================
@Component({
  selector: 'app-doc-page',
  imports: [TranslatePipe, ButtonModule],
  template: `
    @if (doc(); as d) {
      <div class="container page">
        <article class="card doc">
          <h1>{{ c.tr(d.title) }}</h1>
          @if (i18n.lang() === 'tj' && !c.hasTj(d.sections[0].h)) { <div class="note"><i class="pi pi-info-circle"></i> {{ 'ruOnly' | t }}</div> }
          @if (d.lead) { <p class="lead">{{ c.tr(d.lead) }}</p> }
          @if (d.sections.length > 4) {
            <nav class="toc">@for (s of d.sections; track $index) { <a [href]="'#s' + $index" (click)="go($event, $index)">{{ c.tr(s.h) }}</a> }</nav>
          }
          @for (s of d.sections; track $index) {
            <section [id]="'s' + $index">
              <h2>{{ c.tr(s.h) }}</h2>
              @for (p of s.p ?? []; track $index) { <p>{{ c.tr(p) }}</p> }
              @if (s.list) { <ul>@for (li of s.list; track $index) { <li>{{ c.tr(li) }}</li> }</ul> }
            </section>
          }
          @if (d.downloads?.length) {
            <h2>{{ 'downloads' | t }}</h2>
            @for (f of d.downloads; track f.file) {
              <p><a [href]="f.file" download><p-button [label]="c.tr(f.title)" icon="pi pi-download" [outlined]="true" size="small" /></a></p>
            }
          }
        </article>
      </div>
    }
  `,
  styles: PAGE_STYLES,
})
export class DocPage {
  readonly name = input.required<string>();      // из data маршрута
  c = inject(ContentService);
  i18n = inject(I18nService);
  doc = toSignal(toObservable(this.name).pipe(switchMap((n) => this.c.load<ContentDoc>(n))));
  go(e: Event, i: number) { e.preventDefault(); document.getElementById('s' + i)?.scrollIntoView({ behavior: 'smooth' }); }
}

// =====================================================================
// О платформе
// =====================================================================
@Component({
  selector: 'app-about',
  imports: [RouterLink, TranslatePipe, ButtonModule],
  template: `
    <div class="container page">
      <img src="/img/ui/hero.svg" alt="" class="hero" />
      @if (doc(); as d) {
        <article class="card doc">
          <h1>{{ c.tr(d.title) }}</h1>
          @for (s of d.sections; track $index) {
            <h2>{{ c.tr(s.h) }}</h2>
            @for (p of s.p ?? []; track $index) { <p>{{ c.tr(p) }}</p> }
            @if (s.list) { <ul>@for (li of s.list; track $index) { <li>{{ c.tr(li) }}</li> }</ul> }
          }
          <div class="links">
            <a routerLink="/help"><p-button [label]="'help' | t" icon="pi pi-question-circle" [outlined]="true" /></a>
            <a routerLink="/partners"><p-button [label]="'partners' | t" icon="pi pi-shop" [outlined]="true" /></a>
            <a routerLink="/legal"><p-button [label]="'legalBase' | t" icon="pi pi-book" [outlined]="true" /></a>
          </div>
        </article>
      }
    </div>
  `,
  styles: PAGE_STYLES + `.hero { width: 100%; border-radius: 14px; display: block; margin-bottom: 18px; } .links { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; }`,
})
export class AboutPage {
  c = inject(ContentService);
  doc = toSignal(this.c.load<ContentDoc>('about'));
}

// =====================================================================
// Вопросы и ответы (FAQ)
// =====================================================================
interface Faq { title: LText; groups: { group: LText; items: { q: LText; a: LText }[] }[]; }

@Component({
  selector: 'app-faq',
  imports: [AccordionModule, TranslatePipe],
  template: `
    <div class="container page">
      @if (faq(); as f) {
        <h1 class="page-title">{{ c.tr(f.title) }}</h1>
        @for (g of f.groups; track $index) {
          <h2>{{ c.tr(g.group) }}</h2>
          <p-accordion [multiple]="true" styleClass="card acc">
            @for (it of g.items; track $index) {
              <p-accordion-panel [value]="$index">
                <p-accordion-header>{{ c.tr(it.q) }}</p-accordion-header>
                <p-accordion-content><p>{{ c.tr(it.a) }}</p></p-accordion-content>
              </p-accordion-panel>
            }
          </p-accordion>
        }
        <p class="muted ask"><i class="pi pi-phone"></i> {{ 'stillQuestions' | t }}</p>
      }
    </div>
  `,
  styles: PAGE_STYLES + `.ask { margin-top: 24px; } :host ::ng-deep .acc { overflow: hidden; }`,
})
export class FaqPage {
  c = inject(ContentService);
  faq = toSignal(this.c.load<Faq>('faq'));
}

// =====================================================================
// Помощь: шаги заказа и видеоуроки
// =====================================================================
interface Help { title: LText; steps: { h: LText; p: LText; img: string }[]; videos: { src: string; poster: string; title: LText }[]; }

@Component({
  selector: 'app-help',
  imports: [RouterLink, TranslatePipe, ButtonModule],
  template: `
    <div class="container">
      @if (help(); as h) {
        <h1 class="page-title">{{ c.tr(h.title) }}: {{ 'howToOrder' | t }}</h1>
        <div class="grid steps">
          @for (s of h.steps; track $index) {
            <div class="card step">
              <img [src]="s.img" alt="" />
              <div class="num">{{ $index + 1 }}</div>
              <b>{{ c.tr(s.h) }}</b>
              <p class="muted">{{ c.tr(s.p) }}</p>
            </div>
          }
        </div>
        <h2 class="section-title vt">{{ 'videoLessons' | t }}</h2>
        <div class="grid videos">
          @for (v of h.videos; track v.src) {
            <div class="card vid">
              <video [src]="v.src" [poster]="v.poster" controls preload="metadata" playsinline></video>
              <b>{{ c.tr(v.title) }}</b>
            </div>
          }
        </div>
        <div class="more">
          <a routerLink="/faq"><p-button [label]="'faq' | t" icon="pi pi-comments" [outlined]="true" /></a>
          <a routerLink="/courier-rules"><p-button [label]="'courierRules' | t" icon="pi pi-car" [outlined]="true" /></a>
        </div>
      }
    </div>
  `,
  styles: `
    .steps { grid-template-columns: repeat(4, 1fr); }
    .step { padding: 16px; position: relative; display: flex; flex-direction: column; gap: 6px; }
    .step img { width: 100%; border-radius: 10px; }
    .num { position: absolute; top: 24px; left: 24px; width: 30px; height: 30px; border-radius: 50%; background: var(--tz-primary); color: #fff; display: grid; place-items: center; font-weight: 600; }
    .step p { margin: 0; font-size: 13px; line-height: 1.5; }
    .vt { margin-top: 28px; }
    .videos { grid-template-columns: 1fr 1fr; }
    .vid { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    video { width: 100%; border-radius: 10px; background: #0f172a; aspect-ratio: 16 / 10; }
    .more { display: flex; gap: 10px; margin-top: 22px; flex-wrap: wrap; }
    @media (max-width: 900px) { .steps, .videos { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 560px) { .steps, .videos { grid-template-columns: 1fr; } }
  `,
})
export class HelpPage {
  c = inject(ContentService);
  help = toSignal(this.c.load<Help>('help'));
}

// =====================================================================
// Нормативно-правовая база
// =====================================================================
interface LegalItem { title: LText; date: string; area: LText; use: LText; }

@Component({
  selector: 'app-legal',
  imports: [TableModule, TagModule, TranslatePipe],
  template: `
    <div class="container">
      @if (base(); as b) {
        <h1 class="page-title">{{ c.tr(b.title) }}</h1>
        <p class="muted lead">{{ 'legalLead' | t }}</p>
        <p-table [value]="b.items" styleClass="card" [tableStyle]="{ 'min-width': '760px' }">
          <ng-template #header><tr><th style="width:28%">{{ 'law' | t }}</th><th style="width:14%">{{ 'lawDate' | t }}</th><th style="width:13%">{{ 'lawArea' | t }}</th><th>{{ 'lawUse' | t }}</th></tr></ng-template>
          <ng-template #body let-it>
            <tr><td><b>{{ c.tr(it.title) }}</b></td><td class="muted">{{ it.date }}</td><td><p-tag [value]="c.tr(it.area)" severity="secondary" /></td><td>{{ c.tr(it.use) }}</td></tr>
          </ng-template>
        </p-table>
        <p class="muted small">{{ 'updated' | t }} {{ b.updated }}</p>
      }
    </div>
  `,
  styles: `.lead { margin: -6px 0 16px; } .small { font-size: 12px; margin-top: 10px; }`,
})
export class LegalPage {
  c = inject(ContentService);
  base = toSignal(this.c.load<{ title: LText; updated: string; items: LegalItem[] }>('legal-base'));
}

// =====================================================================
// Источники изображений (атрибуция фотографий по условиям лицензий CC)
// =====================================================================
interface Credit { file: string; title: string; author: string; license: string; licenseUrl: string; source: string; }

@Component({
  selector: 'app-credits',
  imports: [TranslatePipe],
  template: `
    <div class="container">
      <h1 class="page-title">{{ 'photoCredits' | t }}</h1>
      <p class="muted lead">{{ 'creditsLead' | t }}</p>
      <div class="grid list">
        @for (c of credits(); track c.file) {
          <div class="card cr">
            <img [src]="c.file" alt="" loading="lazy" />
            <div class="txt">
              <b>{{ c.title }}</b>
              <span class="muted">{{ 'author' | t }}: {{ c.author || '—' }}</span>
              <span class="muted">{{ 'license' | t }}: @if (c.licenseUrl) { <a [href]="c.licenseUrl" target="_blank" rel="noopener">{{ c.license }}</a> } @else { {{ c.license }} }</span>
              <a [href]="c.source" target="_blank" rel="noopener" class="src">Wikimedia Commons <i class="pi pi-external-link"></i></a>
            </div>
          </div>
        }
      </div>
      <p class="muted small">{{ 'creditsNote' | t }}</p>
    </div>
  `,
  styles: `
    .lead { margin: -6px 0 16px; max-width: 760px; line-height: 1.6; }
    .list { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
    .cr { display: flex; gap: 12px; padding: 10px; align-items: center; }
    .cr img { width: 84px; height: 84px; object-fit: cover; border-radius: 10px; flex: 0 0 84px; }
    .txt { display: flex; flex-direction: column; gap: 3px; font-size: 12px; min-width: 0; }
    .txt b { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .txt a { color: var(--tz-primary); }
    .small { font-size: 12px; margin-top: 16px; }
  `,
})
export class CreditsPage {
  c = inject(ContentService);
  credits = toSignal(this.c.load<Credit[]>('photo-credits'), { initialValue: [] as Credit[] });
}

// =====================================================================
// 404
// =====================================================================
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonModule, TranslatePipe],
  template: `
    <div class="container nf">
      <img src="/img/ui/not-found.svg" alt="404" />
      <h1>{{ 'notFound' | t }}</h1>
      <a routerLink="/"><p-button [label]="'toHome' | t" icon="pi pi-home" /></a>
    </div>
  `,
  styles: `.nf { text-align: center; padding-top: 60px; } .nf img { width: 260px; } h1 { font-size: 22px; margin: 18px 0; }`,
})
export class NotFoundPage {}
