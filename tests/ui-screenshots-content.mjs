// Скриншоты основного и дополнительного интерфейса для раздела 3.1 отчёта.
// Запуск: APP_URL=http://localhost:5080 node tests/ui-screenshots-content.mjs <папка>
import { chromium } from 'playwright';

const APP = process.env.APP_URL ?? 'http://localhost:5080';
const OUT = process.argv[2] ?? 'screenshots';
const browser = await chromium.launch();
const hideToasts = (p) => p.addStyleTag({ content: '.p-toast { display: none !important; }' });

async function open(path, { phone, lang = 'ru', viewport = { width: 1440, height: 900 }, full = false } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5, locale: 'ru-RU' });
  const page = await ctx.newPage();
  await page.goto(APP + '/login');
  await page.evaluate((l) => localStorage.setItem('tz_lang', l), lang);
  if (phone) {
    await page.fill('input[name=phone]', phone);
    await page.fill('p-password input', '123456');
    await page.click('button[type=submit]');
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  }
  await page.goto(APP + path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(700);
  return page;
}
async function shot(page, name, full = false) { await hideToasts(page); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); }

// Основной интерфейс
let p = await open('/', { phone: '+992900000001' });              await shot(p, 'c01_home');
p = await open('/restaurant/1', { phone: '+992900000001' });
for (const n of ['Плов ош', 'Плов ош', 'Шурбо']) { await p.locator('.dish', { hasText: n }).locator('button').last().click(); await p.waitForTimeout(250); }
await shot(p, 'c02_menu');
await p.getByRole('button', { name: 'Перейти к оформлению' }).click(); await p.waitForURL('**/checkout');
await p.fill('input[placeholder^="ул."]', 'ул. Камоли Худжанди, 12, кв. 34'); await p.waitForTimeout(300);
await shot(p, 'c03_checkout');
await p.getByRole('button', { name: 'Подтвердить заказ' }).click(); await p.waitForURL(/\/orders\/\d+/);

// Второй заказ проводим через API до статуса «Готов к выдаче», чтобы он был виден в панели курьера
const api = async (method, path, token, body) => (await fetch(APP + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined })).json();
const tok = async (phone) => (await api('POST', '/auth/login', null, { phone, password: '123456' })).token;
const cl = await tok('+992900000002'), ad = await tok('+992910000001');
const menu = await api('GET', '/restaurants/1/menu');
const o2 = await api('POST', '/orders', cl, { restaurantId: 1, items: [{ dishId: menu.dishes[4].id, quantity: 2 }], deliveryAddress: '19-мкр, дом 6, кв. 51', contactPhone: '+992900000002' });
for (const st of ['accepted', 'cooking']) await api('POST', `/manage/orders/${o2.id}/status`, ad, { status: st });
const cs = await api('GET', '/manage/couriers', ad);
await api('POST', `/manage/orders/${o2.id}/courier`, ad, { courierId: cs[0].id });
await api('POST', `/manage/orders/${o2.id}/status`, ad, { status: 'ready' });
p = await open('/manage', { phone: '+992910000001' });            await shot(p, 'c04_manage');
p = await open('/courier', { phone: '+992920000001' });           await shot(p, 'c05_courier');
p = await open('/admin', { phone: '+992900000000' });             await shot(p, 'c06_admin');

// Дополнительный интерфейс (контент)
p = await open('/register');                                      await shot(p, 'c07_register');
p = await open('/about');                                         await shot(p, 'c08_about');
p = await open('/help');                                          await shot(p, 'c09_help', true);
p = await open('/faq');
await p.locator('p-accordion-header').first().click(); await p.waitForTimeout(500);
await shot(p, 'c10_faq');
p = await open('/terms');                                         await shot(p, 'c11_terms');
p = await open('/privacy');                                       await shot(p, 'c12_privacy');
p = await open('/legal');                                         await shot(p, 'c13_legal', true);
p = await open('/partners');                                      await shot(p, 'c14_partners');
p = await open('/courier-rules', { lang: 'tj' });                 await shot(p, 'c15_courier_rules_tj');
p = await open('/no-such-page');                                  await shot(p, 'c16_404');
p = await open('/about');
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(400);
await shot(p, 'c17_footer');
p = await open('/faq', { lang: 'tj', viewport: { width: 390, height: 844 } });
await p.locator('p-accordion-header').first().click(); await p.waitForTimeout(500);
await shot(p, 'c18_mobile_faq_tj');
p = await open('/', { viewport: { width: 390, height: 844 }, lang: 'tj' }); await shot(p, 'c19_mobile_home_tj');

await browser.close();
console.log('ok');
