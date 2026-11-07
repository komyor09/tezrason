// Запись видеоуроков (медиаконтент платформы) с помощью Playwright.
// Сценарий выполняется на работающем приложении, на экран выводятся подписи шагов.
// Запуск: APP_URL=http://localhost:5080 node tests/record-video-lessons.mjs <папка для webm>
import { chromium } from 'playwright';
import fs from 'node:fs';

const APP = process.env.APP_URL ?? 'http://localhost:5080';
const OUT = process.argv[2] ?? 'media';
const size = { width: 1280, height: 800 };
const browser = await chromium.launch();

async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('tz-caption');
    if (!el) {
      el = document.createElement('div'); el.id = 'tz-caption';
      el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;background:rgba(15,23,42,.88);color:#fff;'
        + 'padding:12px 22px;border-radius:12px;font:500 18px Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)';
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
  await page.waitForTimeout(1600);
}

async function lesson(file, phone, steps) {
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: OUT + '/tmp', size }, locale: 'ru-RU' });
  const page = await ctx.newPage();
  await page.goto(APP + '/login');
  await page.evaluate(() => localStorage.setItem('tz_lang', 'ru'));
  await page.reload();
  await caption(page, 'Вход по номеру телефона и паролю');
  await page.fill('input[name=phone]', phone);
  await page.fill('p-password input', '123456');
  await page.waitForTimeout(600);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await steps(page);
  const video = page.video();
  await ctx.close();
  fs.renameSync(await video.path(), `${OUT}/${file}`);
}

// ---------- Видеоурок 1: как оформить заказ ----------
await lesson('howto-order.webm', '+992900000001', async (page) => {
  await page.waitForSelector('.item');
  await caption(page, 'Шаг 1. Выберите заведение на главной странице');
  await page.mouse.wheel(0, 300); await page.waitForTimeout(800);
  await page.getByText('Чайхона №1').first().click();
  await page.waitForSelector('.dish');
  await caption(page, 'Шаг 2. Добавьте блюда кнопкой «+»');
  const add = async (n) => { await page.locator('.dish', { hasText: n }).locator('button').last().click(); await page.waitForTimeout(700); };
  await add('Плов ош'); await add('Плов ош'); await add('Шурбо');
  await page.getByText('Выпечка', { exact: true }).click(); await page.waitForTimeout(500);
  await add('Самбуса с мясом');
  await caption(page, 'Сумма и стоимость доставки — в корзине справа');
  await page.getByRole('button', { name: 'Перейти к оформлению' }).click();
  await page.waitForURL('**/checkout');
  await caption(page, 'Шаг 3. Укажите адрес, телефон и способ оплаты');
  await page.locator('input[placeholder^="ул."]').pressSequentially('ул. Камоли Худжанди, 12, кв. 34', { delay: 35 });
  await page.locator('textarea').pressSequentially('Позвонить за 5 минут', { delay: 35 });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Подтвердить заказ' }).click();
  await page.waitForURL(/\/orders\/\d+/);
  await page.waitForSelector('.steps');
  await page.waitForTimeout(500);
  await caption(page, 'Шаг 4. Следите за статусом заказа и курьером');
  await page.waitForTimeout(1800);
  await caption(page, 'Готово! Оплата — при получении заказа');
});

// ---------- Видеоурок 2: обработка заказа в панели заведения ----------
await lesson('howto-restaurant.webm', '+992910000001', async (page) => {
  await page.waitForSelector('.order');
  await caption(page, 'Новые заказы появляются во вкладке «Заказы»');
  const first = () => page.locator('.order').first();
  await caption(page, 'Примите заказ кнопкой «Принять»');
  await first().getByRole('button', { name: 'Принять' }).click(); await page.waitForTimeout(1200);
  await caption(page, 'Передайте заказ на кухню');
  await first().getByRole('button', { name: 'На кухню' }).click(); await page.waitForTimeout(1200);
  await caption(page, 'Назначьте курьера из тех, кто на смене');
  await first().getByRole('button', { name: 'Назначить курьера' }).first().click();
  await page.locator('p-dialog .p-select').first().click(); await page.waitForTimeout(600);
  await page.locator('.p-select-option', { hasText: 'Фаррух' }).click(); await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Сохранить' }).click(); await page.waitForTimeout(1200);
  await caption(page, 'Когда заказ упакован — нажмите «Готов»');
  await first().getByRole('button', { name: 'Готов' }).click(); await page.waitForTimeout(1200);
  await caption(page, 'Меню и доступность блюд — во вкладке «Меню»');
  await page.getByRole('tab', { name: /Меню/ }).click(); await page.waitForTimeout(1500);
  await caption(page, 'Выручка и популярные блюда — во вкладке «Статистика»');
  await page.getByRole('tab', { name: /Статистика/ }).click(); await page.waitForTimeout(2200);
});

fs.rmSync(OUT + '/tmp', { recursive: true, force: true });
await browser.close();
console.log('Видеоуроки сохранены в', OUT);
