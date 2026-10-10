import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';
import { TranslatePipe } from '../core/i18n.service';
import { AuthResponse } from '../core/models';

const AUTH_STYLES = `
  .wrap { min-height: calc(100vh - 68px); display: grid; place-items: center; padding: 24px 16px; }
  .box { width: 100%; max-width: 400px; padding: 32px 28px; }
  h1 { color: var(--tz-primary); text-align: center; margin: 0; font-size: 26px; }
  .sub { text-align: center; color: var(--tz-muted); margin: 6px 0 24px; }
  label { display: block; font-size: 13px; margin: 14px 0 6px; color: #334155; }
  .full { width: 100%; }
  :host ::ng-deep .p-password, :host ::ng-deep .p-password input, :host ::ng-deep p-iconfield { width: 100%; }
  .alt { text-align: center; margin-top: 20px; color: var(--tz-muted); }
  .demo { margin-top: 22px; border-top: 1px dashed var(--tz-border); padding-top: 14px; font-size: 12px; color: var(--tz-muted); }
  .demo button { background: #f1f5f9; border: 0; border-radius: 6px; padding: 4px 8px; margin: 3px; cursor: pointer; font-size: 12px; }
`;

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule, IconFieldModule, InputIconModule, TranslatePipe],
  template: `
    <div class="wrap">
      <form class="card box" (ngSubmit)="submit()">
        <h1>TezRason</h1>
        <div class="sub">{{ 'platformTitle' | t }}</div>
        <label>{{ 'phone' | t }}</label>
        <p-iconfield><p-inputicon class="pi pi-phone" />
          <input pInputText class="full" name="phone" [(ngModel)]="phone" placeholder="+992 XX XXX XX XX" autocomplete="username" />
        </p-iconfield>
        <label>{{ 'password' | t }}</label>
        <p-password name="password" [(ngModel)]="password" [feedback]="false" [toggleMask]="true" inputStyleClass="full" autocomplete="current-password" />
        <p-button type="submit" styleClass="full" [label]="'login' | t" [loading]="busy()" [style]="{ width: '100%', marginTop: '22px' }" />
        <div class="alt">{{ 'noAccount' | t }} <a routerLink="/register" class="green">{{ 'register' | t }}</a></div>
        <div class="demo">
          {{ 'demoAccounts' | t }}:<br />
          @for (d of demo; track d.phone) { <button type="button" (click)="phone = d.phone; password = '123456'">{{ d.label }}</button> }
        </div>
      </form>
    </div>
  `,
  styles: AUTH_STYLES,
})
export class LoginPage {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  phone = '';
  password = '';
  busy = signal(false);
  demo = [
    { label: 'Клиент', phone: '+992900000001' },
    { label: 'Админ заведения', phone: '+992910000001' },
    { label: 'Курьер', phone: '+992920000001' },
    { label: 'Суперадмин', phone: '+992900000000' },
  ];

  submit() {
    this.busy.set(true);
    this.auth.login(this.phone, this.password).subscribe({
      next: (r: AuthResponse) => this.router.navigateByUrl(this.auth.homeFor(r.user.role)),
      error: (e) => { this.busy.set(false); this.api.fail(e); },
    });
  }
}

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule, TranslatePipe],
  template: `
    <div class="wrap">
      <form class="card box" (ngSubmit)="submit()">
        <h1>TezRason</h1>
        <div class="sub">{{ 'register' | t }}</div>
        <label>{{ 'fullName' | t }}</label>
        <input pInputText class="full" name="fullName" [(ngModel)]="fullName" />
        <label>{{ 'phone' | t }}</label>
        <input pInputText class="full" name="phone" [(ngModel)]="phone" placeholder="+992XXXXXXXXX" />
        <label>{{ 'password' | t }}</label>
        <p-password name="password" [(ngModel)]="password" [toggleMask]="true" inputStyleClass="full" />
        <p-button type="submit" [label]="'register' | t" [loading]="busy()" [style]="{ width: '100%', marginTop: '22px' }" />
        <div class="alt">{{ 'haveAccount' | t }} <a routerLink="/login" class="green">{{ 'login' | t }}</a></div>
      </form>
    </div>
  `,
  styles: AUTH_STYLES,
})
export class RegisterPage {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  fullName = '';
  phone = '+992';
  password = '';
  busy = signal(false);

  submit() {
    this.busy.set(true);
    this.auth.register(this.fullName, this.phone, this.password).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (e) => { this.busy.set(false); this.api.fail(e); },
    });
  }
}
