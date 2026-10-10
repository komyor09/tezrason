import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, Role, User } from './models';
import { I18nService } from './i18n.service';

const KEY = 'tz_auth';

/** Хранение сессии пользователя (JWT-токен + профиль). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private i18n = inject(I18nService);
  private readonly session = signal<AuthResponse | null>(this.restore());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isLoggedIn = computed(() => !!this.session());

  login(phone: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { phone, password }).pipe(tap((r) => this.save(r)));
  }

  register(fullName: string, phone: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', { fullName, phone, password, language: this.i18n.lang() })
      .pipe(tap((r) => this.save(r)));
  }

  logout() {
    this.session.set(null);
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    this.router.navigateByUrl('/login');
  }

  /** Стартовая страница для каждой роли. */
  homeFor(role?: Role): string {
    switch (role) {
      case 'courier': return '/courier';
      case 'restaurant_admin': return '/manage';
      case 'super_admin': return '/admin';
      default: return '/';
    }
  }

  setLanguage(lang: 'ru' | 'tj') {
    this.i18n.set(lang);
    if (this.isLoggedIn()) this.http.put<User>('/api/auth/language', { language: lang }).subscribe({ error: () => {} });
  }

  private save(r: AuthResponse) {
    this.session.set(r);
    this.i18n.set(r.user.language);
    try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* ignore */ }
  }

  private restore(): AuthResponse | null {
    try {
      const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as AuthResponse | null;
      return r && new Date(r.expiresAt) > new Date() ? r : null;
    } catch { return null; }
  }
}

/** Добавляет JWT-токен ко всем запросам к API и обрабатывает истечение сессии. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const r = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(r).pipe(tap({ error: (e) => { if (e.status === 401 && token) auth.logout(); } }));
};

/** Ограничение доступа к маршруту по ролям. */
export const roleGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) return router.parseUrl('/login');
  return roles.includes(user.role) ? true : router.parseUrl(auth.homeFor(user.role));
};
