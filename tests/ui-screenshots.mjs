// Сквозной UI-тест (Playwright): проходит полный сценарий заказа через интерфейс всех ролей
// и сохраняет скриншоты экранов. Запуск: APP_URL=http://localhost:5080 node tests/ui-screenshots.mjs <папка>
import { chromium } from 'playwright';

const APP = process.env.APP_URL ?? 'http://localhost:5080';
const OUT = process.argv[2] ?? 'screenshots';
const browser = await chromium.launch();
const shot = async (page, name) => {
  await page.addStyleTag({ content: '.p-toast { display: none !important; }' });
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const pause = (page, ms = 700) => page.waitForTimeout(ms);

async function session(phone, lang = 'ru', viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5, locale: 'ru-RU' });
  const page = await ctx.newPage();
  await page.goto(APP + '/login');
  await page.evaluate((l) => localStorage.setItem('tz_lang', l), lang);
  if (phone) {
    await page.fill('input[name=phone]', phone);
    await page.fill('p-password input', '123456');
    await page.click('button[type=submit]');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    if (lang !== 'ru') { await page.getByText('TJ', { exact: true }).click(); }
    await pause(page);
  }
  return page;
}

// 1. Страница входа
const guest = await session(null);
await guest.reload(); await pause(guest);
await shot(guest, '01_login');

// 2. Клиент: каталог → меню → корзина → оформление → отслеживание
const client = await session('+992900000001');
await client.waitForSelector('.item');
await shot(client, '02_restaurants');
await client.getByText('Чайхона №1').first().click();
await client.waitForSelector('.dish');
const addDish = async (name) => { await client.locator('.dish', { hasText: name }).locator('button').last().click(); await pause(client, 250); };
await addDish('Плов ош'); await addDish('Плов ош'); await addDish('Шурбо');
await client.getByText('Шашлыки', { exact: true }).click(); await pause(client, 300);
await addDish('Кабоб из баранины');
await pause(client);
await shot(client, '03_menu_cart');
await client.getByRole('button', { name: 'Перейти к оформлению' }).click();
await client.waitForURL('**/checkout');
await client.fill('input[placeholder^="ул."]', 'ул. Камоли Худжанди, 12, кв. 34');
await client.fill('textarea', 'Позвонить за 5 минут');
await pause(client);
await shot(client, '04_checkout');
await client.getByRole('button', { name: 'Подтвердить заказ' }).click();
await client.waitForURL(/\/orders\/\d+/);
await pause(client, 1000);
await shot(client, '05_tracking_new');
const orderUrl = client.url();

// 3. Администратор заведения: принять, на кухню, назначить курьера, готов
const admin = await session('+992910000001');
await admin.waitForSelector('.order');
await shot(admin, '06_manage_orders');
const card = admin.locator('.order').first();
await card.getByRole('button', { name: 'Принять' }).click(); await pause(admin, 900);
await admin.locator('.order').first().getByRole('button', { name: 'На кухню' }).click(); await pause(admin, 900);
await admin.locator('.order').first().getByRole('button', { name: 'Назначить курьера' }).first().click();
await admin.waitForSelector('p-dialog .p-select');
await admin.locator('p-dialog .p-select').first().click();
await admin.locator('.p-select-option', { hasText: 'Фаррух' }).click();
await pause(admin, 300);
await shot(admin, '07_assign_courier');
await admin.getByRole('button', { name: 'Сохранить' }).click(); await pause(admin, 900);
await admin.locator('.order').first().getByRole('button', { name: 'Готов' }).click(); await pause(admin, 900);
await admin.getByRole('tab', { name: /Меню/ }).click(); await pause(admin);
await shot(admin, '08_manage_menu');
await admin.getByText('TJ', { exact: true }).click(); await pause(admin, 400);
await admin.getByRole('tab', { name: /Омор/ }).click(); await pause(admin, 900);
await shot(admin, '09_manage_stats_tj');
await admin.getByText('RU', { exact: true }).click();

// 4. Курьер: забрал заказ
const courier = await session('+992920000001');
await courier.waitForSelector('.order');
await shot(courier, '10_courier');
await courier.locator('.order').first().getByRole('button', { name: 'Забрал заказ' }).click(); await pause(courier, 900);

// 5. Клиент видит, что курьер в пути
await client.goto(orderUrl); await pause(client, 1200);
await shot(client, '11_tracking_on_the_way');

// 6. Курьер доставил → клиент оставляет отзыв
await courier.locator('.order').first().getByRole('button', { name: 'Доставлен' }).click(); await pause(courier, 900);
await client.goto(orderUrl); await pause(client, 1200);
await shot(client, '12_tracking_delivered');
await client.getByRole('button', { name: 'Отправить' }).click(); await pause(client, 900);
await client.goto(APP + '/orders'); await pause(client, 900);
await shot(client, '13_my_orders');

// 7. Суперадминистратор
const sa = await session('+992900000000');
await sa.waitForSelector('p-table');
await shot(sa, '14_admin_restaurants');
await sa.getByRole('button', { name: /Пользователи/ }).click(); await pause(sa);
await shot(sa, '15_admin_users');
await sa.getByRole('button', { name: /Статистика/ }).click(); await pause(sa);
await shot(sa, '16_admin_stats');

// 8. Мобильная версия
const mobile = await session('+992900000001', 'tj', { width: 390, height: 844 });
await mobile.goto(APP + '/'); await mobile.waitForSelector('.item'); await pause(mobile);
await shot(mobile, '17_mobile_restaurants_tj');
await mobile.goto(orderUrl); await pause(mobile, 1200);
await shot(mobile, '18_mobile_tracking_tj');

await browser.close();
console.log('Скриншоты сохранены в', OUT);
