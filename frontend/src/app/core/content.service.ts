import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { I18nService } from './i18n.service';

/** Локализованная строка контента: русский и таджикский варианты. */
export interface LText { ru: string; tj: string; }
export interface ContentSection { h: LText; p?: LText[]; list?: LText[]; }
export interface ContentDoc { title: LText; lead?: LText; sections: ContentSection[]; downloads?: { file: string; title: LText }[]; }

/**
 * Загрузка текстового контента платформы (соглашение, политика, FAQ, помощь, правила).
 * Контент хранится в статических JSON-ресурсах /content/*.json и кэшируется на время сессии.
 */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private cache = new Map<string, Observable<any>>();

  load<T = ContentDoc>(name: string): Observable<T> {
    if (!this.cache.has(name)) this.cache.set(name, this.http.get<T>(`/content/${name}.json`).pipe(shareReplay(1)));
    return this.cache.get(name)!;
  }

  /** Текст на текущем языке; если таджикского варианта нет — русский. */
  tr(t?: LText | null): string {
    if (!t) return '';
    return (this.i18n.lang() === 'tj' && t.tj) ? t.tj : t.ru;
  }

  /** Есть ли у текста таджикский вариант (для пометки документов, опубликованных только на русском). */
  hasTj(t?: LText | null): boolean { return !!t?.tj; }
}
