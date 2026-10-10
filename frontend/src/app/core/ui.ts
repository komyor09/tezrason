import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/** Цвет тега PrimeNG для статуса заказа (единый во всех панелях — табл. 2.18). */
export function statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
  switch (status) {
    case 'new': return 'contrast';
    case 'accepted': case 'cooking': return 'info';
    case 'ready': return 'warn';
    case 'on_the_way': return 'info';
    case 'delivered': return 'success';
    case 'cancelled': return 'danger';
    case 'active': return 'success';
    case 'pending': return 'warn';
    case 'blocked': return 'danger';
    default: return 'secondary';
  }
}

/** Форматирование суммы: «144 сомонӣ». */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(v: number | null | undefined): string {
    const n = Number(v ?? 0);
    const s = n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return `${s} ${this.i18n.t('somoni')}`;
  }
}

/** Время в часовом поясе Таджикистана. */
@Pipe({ name: 'localTime' })
export class LocalTimePipe implements PipeTransform {
  transform(v: string | null | undefined, withDate = false): string {
    if (!v) return '';
    const d = new Date(v.endsWith('Z') || v.includes('+') ? v : v + 'Z');
    return d.toLocaleString('ru-RU', {
      timeZone: 'Asia/Dushanbe', hour: '2-digit', minute: '2-digit',
      ...(withDate ? { day: '2-digit', month: '2-digit' } : {}),
    });
  }
}
