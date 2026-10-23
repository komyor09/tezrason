import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../core/i18n.service';

/** Подвал сайта: ссылки на дополнительный интерфейс (контентные страницы и документы). */
@Component({
  selector: 'app-footer',
  imports: [RouterLink, TranslatePipe],
  template: `
    <footer>
      <div class="inner">
        <div class="brand">
          <div class="row"><img src="/img/ui/logo.svg" alt="" width="34" height="34" /><b>TezRason</b></div>
          <p>{{ 'appSubtitle' | t }} · Худжанд</p>
          <p><i class="pi pi-phone"></i> +992 92 700 00 00</p>
          <p><i class="pi pi-envelope"></i> support&#64;tezrason.tj</p>
        </div>
        <div><h4>{{ 'forClients' | t }}</h4>
          <a routerLink="/about">{{ 'about' | t }}</a><a routerLink="/help">{{ 'help' | t }}</a><a routerLink="/faq">{{ 'faq' | t }}</a></div>
        <div><h4>{{ 'forBusiness' | t }}</h4>
          <a routerLink="/partners">{{ 'partners' | t }}</a><a routerLink="/courier-rules">{{ 'courierRules' | t }}</a></div>
        <div><h4>{{ 'documents' | t }}</h4>
          <a routerLink="/terms">{{ 'terms' | t }}</a><a routerLink="/privacy">{{ 'privacy' | t }}</a><a routerLink="/legal">{{ 'legalBase' | t }}</a><a routerLink="/credits">{{ 'photoCredits' | t }}</a></div>
      </div>
      <div class="copy">© 2026 TezRason. {{ 'rights' | t }}</div>
    </footer>
  `,
  styles: `
    footer { background: #0f172a; color: #cbd5e1; margin-top: 48px; }
    .inner { max-width: 1160px; margin: 0 auto; padding: 32px 16px 20px; display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 24px; }
    .brand b { color: #fff; font-size: 17px; }
    .brand p { margin: 8px 0 0; font-size: 13px; color: #94a3b8; }
    h4 { color: #fff; margin: 4px 0 10px; font-size: 14px; }
    a { display: block; color: #cbd5e1; font-size: 13px; margin: 7px 0; }
    a:hover { color: #6ee7b7; }
    .copy { border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b; padding: 14px; }
    @media (max-width: 768px) { .inner { grid-template-columns: 1fr 1fr; } }
  `,
})
export class FooterComponent {}
