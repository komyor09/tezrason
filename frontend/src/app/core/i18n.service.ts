import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { Lang } from './models';

/** Словарь интерфейса на русском и таджикском языках. */
const DICT: Record<string, { ru: string; tj: string }> = {
  appSubtitle: { ru: 'Доставка еды', tj: 'Расонидани хӯрок' },
  search: { ru: 'Поиск заведений…', tj: 'Ҷустуҷӯи муассисаҳо…' },
  login: { ru: 'Войти', tj: 'Даромадан' },
  logout: { ru: 'Выйти', tj: 'Баромадан' },
  register: { ru: 'Регистрация', tj: 'Бақайдгирӣ' },
  phone: { ru: 'Телефон', tj: 'Телефон' },
  password: { ru: 'Пароль', tj: 'Рамз' },
  fullName: { ru: 'Имя и фамилия', tj: 'Ному насаб' },
  platformTitle: { ru: 'Платформа доставки еды', tj: 'Платформаи расонидани хӯрок' },
  noAccount: { ru: 'Нет аккаунта?', tj: 'Ҳисоб надоред?' },
  haveAccount: { ru: 'Уже зарегистрированы?', tj: 'Аллакай ба қайд гирифтаед?' },
  demoAccounts: { ru: 'Демо-доступ (пароль 123456)', tj: 'Дастрасии намоишӣ (рамз 123456)' },
  restaurants: { ru: 'Заведения', tj: 'Муассисаҳо' },
  menu: { ru: 'Меню', tj: 'Меню' },
  myOrders: { ru: 'Мои заказы', tj: 'Фармоишҳои ман' },
  allRestaurants: { ru: 'Все заведения', tj: 'Ҳамаи муассисаҳо' },
  open: { ru: 'Открыто', tj: 'Кушода' },
  closed: { ru: 'Закрыто', tj: 'Пӯшида' },
  min: { ru: 'мин', tj: 'дақ' },
  delivery: { ru: 'Доставка', tj: 'Расонидан' },
  cart: { ru: 'Корзина', tj: 'Сабад' },
  cartEmpty: { ru: 'Корзина пуста', tj: 'Сабад холӣ аст' },
  total: { ru: 'Итого', tj: 'Ҳамагӣ' },
  subtotal: { ru: 'Сумма блюд', tj: 'Маблағи хӯрокҳо' },
  discount: { ru: 'Скидка', tj: 'Тахфиф' },
  toCheckout: { ru: 'Перейти к оформлению', tj: 'Ба расмикунонӣ' },
  minOrder: { ru: 'Минимальная сумма заказа', tj: 'Маблағи ҳадди ақали фармоиш' },
  checkout: { ru: 'Оформление заказа', tj: 'Расмикунонии фармоиш' },
  address: { ru: 'Адрес доставки', tj: 'Суроғаи расонидан' },
  contactPhone: { ru: 'Телефон получателя', tj: 'Телефони гиранда' },
  comment: { ru: 'Комментарий к заказу', tj: 'Шарҳ ба фармоиш' },
  payment: { ru: 'Оплата при получении', tj: 'Пардохт ҳангоми гирифтан' },
  cash: { ru: 'Наличными', tj: 'Нақд' },
  card_on_delivery: { ru: 'Картой курьеру', tj: 'Бо корт ба курйер' },
  confirmOrder: { ru: 'Подтвердить заказ', tj: 'Тасдиқи фармоиш' },
  order: { ru: 'Заказ', tj: 'Фармоиш' },
  courier: { ru: 'Курьер', tj: 'Курйер' },
  call: { ru: 'Позвонить', tj: 'Занг задан' },
  composition: { ru: 'Состав заказа', tj: 'Таркиби фармоиш' },
  cancelOrder: { ru: 'Отменить заказ', tj: 'Бекор кардани фармоиш' },
  leaveReview: { ru: 'Оставить отзыв', tj: 'Фикр гузоштан' },
  food: { ru: 'Блюда', tj: 'Хӯрок' },
  send: { ru: 'Отправить', tj: 'Фиристодан' },
  thanksReview: { ru: 'Спасибо за отзыв!', tj: 'Барои фикратон ташаккур!' },
  noOrders: { ru: 'Заказов пока нет', tj: 'Ҳоло фармоиш нест' },
  details: { ru: 'Подробнее', tj: 'Муфассал' },
  somoni: { ru: 'сомони', tj: 'сомонӣ' },
  // Статусы заказа
  st_new: { ru: 'Новый', tj: 'Нав' },
  st_accepted: { ru: 'Принят', tj: 'Қабул шуд' },
  st_cooking: { ru: 'Готовится', tj: 'Омода мешавад' },
  st_ready: { ru: 'Готов к выдаче', tj: 'Барои супоридан омода' },
  st_on_the_way: { ru: 'В пути', tj: 'Дар роҳ' },
  st_delivered: { ru: 'Доставлен', tj: 'Расонида шуд' },
  st_cancelled: { ru: 'Отменён', tj: 'Бекор шуд' },
  act_accepted: { ru: 'Принять', tj: 'Қабул кардан' },
  act_cooking: { ru: 'На кухню', tj: 'Ба ошхона' },
  act_ready: { ru: 'Готов', tj: 'Омода' },
  act_cancelled: { ru: 'Отменить', tj: 'Бекор кардан' },
  // Панель заведения
  adminPanel: { ru: 'Панель заведения', tj: 'Панели маъмурият' },
  orders: { ru: 'Заказы', tj: 'Фармоишҳо' },
  stats: { ru: 'Статистика', tj: 'Омор' },
  active: { ru: 'Активные', tj: 'Фаъол' },
  completed: { ru: 'Выполненные', tj: 'Иҷрошуда' },
  all: { ru: 'Все', tj: 'Ҳама' },
  assignCourier: { ru: 'Назначить курьера', tj: 'Таъини курйер' },
  noCouriers: { ru: 'Нет курьеров на смене', tj: 'Курйер дар навбат нест' },
  cancelReason: { ru: 'Причина отмены', tj: 'Сабаби бекоркунӣ' },
  addDish: { ru: 'Добавить блюдо', tj: 'Илова кардани хӯрок' },
  addCategory: { ru: 'Добавить категорию', tj: 'Илова кардани категория' },
  edit: { ru: 'Изменить', tj: 'Тағйир додан' },
  save: { ru: 'Сохранить', tj: 'Нигоҳ доштан' },
  cancel: { ru: 'Отмена', tj: 'Бекор' },
  delete: { ru: 'Удалить', tj: 'Нест кардан' },
  available: { ru: 'В наличии', tj: 'Мавҷуд' },
  price: { ru: 'Цена', tj: 'Нарх' },
  category: { ru: 'Категория', tj: 'Категория' },
  nameRu: { ru: 'Название (RU)', tj: 'Ном (RU)' },
  nameTj: { ru: 'Название (TJ)', tj: 'Ном (TJ)' },
  descriptionRu: { ru: 'Описание (RU)', tj: 'Тавсиф (RU)' },
  weight: { ru: 'Вес, г', tj: 'Вазн, г' },
  revenueToday: { ru: 'Выручка сегодня', tj: 'Даромади имрӯза' },
  revenueWeek: { ru: 'Выручка за неделю', tj: 'Даромади ҳафта' },
  ordersTotal: { ru: 'Всего заказов', tj: 'Ҳамаи фармоишҳо' },
  activeOrders: { ru: 'Активные заказы', tj: 'Фармоишҳои фаъол' },
  averageCheck: { ru: 'Средний чек', tj: 'Фармоиши миёна' },
  topDishes: { ru: 'Популярные блюда', tj: 'Хӯрокҳои маъмул' },
  revenueByDay: { ru: 'Выручка по дням', tj: 'Даромад аз рӯи рӯзҳо' },
  pcs: { ru: 'шт.', tj: 'дона' },
  // Курьер
  courierPanel: { ru: 'Панель курьера', tj: 'Панели курйер' },
  onShift: { ru: 'На смене', tj: 'Дар навбат' },
  deliveredToday: { ru: 'Сегодня доставлено', tj: 'Имрӯз расонида шуд' },
  cashToday: { ru: 'Собрано наличными', tj: 'Нақд ҷамъ шуд' },
  from: { ru: 'Откуда', tj: 'Аз куҷо' },
  to: { ru: 'Куда', tj: 'Ба куҷо' },
  clientToPay: { ru: 'Клиент / к оплате', tj: 'Мизоҷ / барои пардохт' },
  pickedUp: { ru: 'Забрал заказ', tj: 'Фармоишро гирифтам' },
  deliveredBtn: { ru: 'Доставлен', tj: 'Расонида шуд' },
  waitingKitchen: { ru: 'Ожидает готовности на кухне', tj: 'Интизори омодагӣ дар ошхона' },
  shiftOff: { ru: 'Включите «На смене», чтобы получать заказы', tj: 'Барои гирифтани фармоиш «Дар навбат»-ро фаъол кунед' },
  // Суперадмин
  superPanel: { ru: 'Панель суперадминистратора', tj: 'Панели суперадминистратор' },
  users: { ru: 'Пользователи', tj: 'Корбарон' },
  activeRestaurants: { ru: 'Активных заведений', tj: 'Муассисаҳои фаъол' },
  pendingRestaurants: { ru: 'Ожидают проверки', tj: 'Интизори санҷиш' },
  ordersToday: { ru: 'Заказов сегодня', tj: 'Фармоишҳои имрӯза' },
  couriersOnShift: { ru: 'Курьеров на смене', tj: 'Курйерҳо дар навбат' },
  restaurant: { ru: 'Заведение', tj: 'Муассиса' },
  administrator: { ru: 'Администратор', tj: 'Маъмур' },
  plan: { ru: 'Тариф', tj: 'Тарифа' },
  ordersMonth: { ru: 'Заказов за месяц', tj: 'Фармоишҳо дар моҳ' },
  status: { ru: 'Статус', tj: 'Ҳолат' },
  action: { ru: 'Действие', tj: 'Амал' },
  activate: { ru: 'Активировать', tj: 'Фаъол кардан' },
  block: { ru: 'Заблокировать', tj: 'Манъ кардан' },
  restore: { ru: 'Восстановить', tj: 'Барқарор кардан' },
  rs_active: { ru: 'Активно', tj: 'Фаъол' },
  rs_pending: { ru: 'На модерации', tj: 'Дар санҷиш' },
  rs_blocked: { ru: 'Заблокировано', tj: 'Манъшуда' },
  role: { ru: 'Роль', tj: 'Нақш' },
  r_client: { ru: 'Клиент', tj: 'Мизоҷ' },
  r_courier: { ru: 'Курьер', tj: 'Курйер' },
  r_restaurant_admin: { ru: 'Админ заведения', tj: 'Маъмури муассиса' },
  r_super_admin: { ru: 'Суперадмин', tj: 'Суперадмин' },
  revenueTotal: { ru: 'Общая выручка', tj: 'Даромади умумӣ' },
  clients: { ru: 'Клиентов', tj: 'Мизоҷон' },
  addCourier: { ru: 'Добавить курьера', tj: 'Илова кардани курйер' },
  transport: { ru: 'Транспорт', tj: 'Нақлиёт' },
  tr_foot: { ru: 'Пешком', tj: 'Пиёда' },
  tr_bicycle: { ru: 'Велосипед', tj: 'Велосипед' },
  tr_scooter: { ru: 'Скутер', tj: 'Скутер' },
  tr_car: { ru: 'Автомобиль', tj: 'Мошин' },
  blocked: { ru: 'Заблокирован', tj: 'Манъ шудааст' },
  error: { ru: 'Ошибка', tj: 'Хато' },
  done: { ru: 'Готово', tj: 'Иҷро шуд' },
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>((this.read() as Lang) ?? 'ru');

  t(key: string): string {
    const e = DICT[key];
    return e ? e[this.lang()] : key;
  }

  /** Выбор поля локализованной сущности: nameRu / nameTj. */
  pick(obj: any, base: string): string {
    return obj?.[base + (this.lang() === 'tj' ? 'Tj' : 'Ru')] || obj?.[base + 'Ru'] || '';
  }

  set(lang: Lang) {
    this.lang.set(lang);
    try { localStorage.setItem('tz_lang', lang); } catch { /* хранилище недоступно */ }
  }

  private read(): string | null {
    try { return localStorage.getItem('tz_lang'); } catch { return null; }
  }
}

@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(key: string): string { return this.i18n.t(key); }
}
