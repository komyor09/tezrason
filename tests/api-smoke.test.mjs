// Сквозной (end-to-end) тест REST API TezRason.
// Запуск: API_URL=http://localhost:5080 node tests/api-smoke.test.mjs
// Требуется запущенный API с демо-данными.

const API = (process.env.API_URL ?? 'http://localhost:5080') + '/api';
let passed = 0, failed = 0;

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.log(`  ✘ ${name} ${extra}`); }
}

const login = async (phone) => (await call('POST', '/auth/login', null, { phone, password: '123456' })).data.token;

console.log('1. Аутентификация');
let r = await call('POST', '/auth/login', null, { phone: '+992900000001', password: 'wrong' });
check('неверный пароль отклоняется (401)', r.status === 401);
const phone = '+99299' + String(Date.now()).slice(-7);
r = await call('POST', '/auth/register', null, { fullName: 'Тестовый Клиент', phone, password: 'secret1' });
check('регистрация нового клиента', r.status === 200 && r.data.user.role === 'client', JSON.stringify(r.data));
r = await call('POST', '/auth/register', null, { fullName: 'Дубль', phone, password: 'secret1' });
check('повторная регистрация телефона отклоняется (409)', r.status === 409);
const client = await login('+992900000001');
const admin = await login('+992910000001');      // администратор «Чайхона №1»
const courier = await login('+992920000001');
const superAdmin = await login('+992900000000');
check('вход всех ролей', client && admin && courier && superAdmin);
r = await call('GET', '/manage/menu', client);
check('клиент не имеет доступа к панели заведения (403)', r.status === 403);
r = await call('GET', '/orders/my');
check('без токена доступ закрыт (401)', r.status === 401);

console.log('2. Каталог и меню');
r = await call('GET', '/restaurants');
check('список активных заведений', r.status === 200 && r.data.length === 4, `получено ${r.data?.length}`);
const chaikhona = r.data.find((x) => x.name === 'Чайхона №1');
r = await call('GET', `/restaurants/${chaikhona.id}/menu`);
check('меню заведения с категориями', r.data.categories.length >= 3 && r.data.dishes.length >= 8);
const plov = r.data.dishes.find((d) => d.nameRu === 'Плов ош');
const kabob = r.data.dishes.find((d) => d.nameRu === 'Кабоб из баранины');

console.log('3. Оформление заказа');
r = await call('POST', '/orders', client, { restaurantId: chaikhona.id, items: [{ dishId: plov.id, quantity: 1 }], deliveryAddress: 'ул. Ленина 1', contactPhone: '+992900000001' });
check('сумма меньше минимальной отклоняется', r.status === 400, JSON.stringify(r.data));
r = await call('POST', '/orders', client, {
  restaurantId: chaikhona.id, items: [{ dishId: plov.id, quantity: 2 }, { dishId: kabob.id, quantity: 1 }],
  deliveryAddress: 'ул. Камоли Худжанди, 12, кв. 34', contactPhone: '+992900000001', paymentMethod: 'cash',
});
const order = r.data;
check('заказ создан со статусом new', r.status === 200 && order.status === 'new', JSON.stringify(r.data));
check('стоимость рассчитана верно (2×35 + 40 + 10 доставка = 120)', order.total === 120 && order.subtotal === 110, `total=${order.total}`);
check('номер заказа TR-XXXXXX', /^TR-\d{6}$/.test(order.orderNumber));

console.log('4. Обработка заказа заведением');
r = await call('POST', `/manage/orders/${order.id}/status`, admin, { status: 'ready' });
check('недопустимый переход new → ready отклоняется (409)', r.status === 409);
r = await call('POST', `/manage/orders/${order.id}/status`, admin, { status: 'accepted' });
check('new → accepted', r.data.status === 'accepted');
r = await call('POST', `/manage/orders/${order.id}/status`, admin, { status: 'cooking' });
check('accepted → cooking', r.data.status === 'cooking');
r = await call('POST', `/manage/orders/${order.id}/status`, admin, { status: 'ready' });
check('ready без курьера отклоняется (400)', r.status === 400);
const couriers = (await call('GET', '/manage/couriers', admin)).data;
const farrukh = couriers.find((c) => c.fullName === 'Фаррух Алиев');
r = await call('POST', `/manage/orders/${order.id}/courier`, admin, { courierId: farrukh.id });
check('курьер назначен', r.data.courier?.id === farrukh.id);
r = await call('POST', `/manage/orders/${order.id}/status`, admin, { status: 'ready' });
check('cooking → ready', r.data.status === 'ready');

console.log('5. Доставка');
r = await call('POST', `/orders/${order.id}/cancel`, client);
check('клиент не может отменить заказ после принятия (409)', r.status === 409);
r = await call('GET', '/courier/orders', courier);
check('заказ виден в панели курьера', r.data.some((o) => o.id === order.id));
r = await call('POST', `/courier/orders/${order.id}/picked-up`, courier);
check('ready → on_the_way', r.data.status === 'on_the_way');
r = await call('POST', `/courier/orders/${order.id}/delivered`, courier);
check('on_the_way → delivered', r.data.status === 'delivered' && r.data.deliveredAt);
check('история содержит все этапы', r.data.history.filter((h) => h.status).length >= 7);

console.log('6. Отзыв');
r = await call('POST', `/orders/${order.id}/review`, client, { foodRating: 5, deliveryRating: 5, comment: 'Отлично' });
check('отзыв сохранён', r.status === 200 && r.data.hasReview);
r = await call('POST', `/orders/${order.id}/review`, client, { foodRating: 4, deliveryRating: 4 });
check('повторный отзыв отклоняется (409)', r.status === 409);

console.log('7. Отмена клиентом нового заказа');
r = await call('POST', '/orders', client, { restaurantId: chaikhona.id, items: [{ dishId: plov.id, quantity: 2 }], deliveryAddress: 'ул. Ленина 1', contactPhone: '+992900000001' });
r = await call('POST', `/orders/${r.data.id}/cancel`, client);
check('new → cancelled клиентом', r.data.status === 'cancelled');

console.log('8. Статистика и администрирование');
r = await call('GET', '/manage/stats', admin);
check('статистика заведения', r.status === 200 && r.data.ordersTotal > 0 && r.data.topDishes.length > 0);
r = await call('GET', '/admin/stats', superAdmin);
check('статистика платформы', r.status === 200 && r.data.activeRestaurants === 4 && r.data.pendingRestaurants === 1);
r = await call('GET', '/admin/restaurants', superAdmin);
const pending = r.data.find((x) => x.status === 'pending');
r = await call('POST', `/admin/restaurants/${pending.id}/status`, superAdmin, { status: 'active' });
check('модерация: заведение активировано', r.status === 204);
r = await call('GET', '/restaurants');
check('новое заведение появилось в каталоге', r.data.length === 5);
r = await call('POST', `/admin/restaurants/${pending.id}/status`, superAdmin, { status: 'blocked' });
check('заведение заблокировано', r.status === 204);

console.log(`\nИтог: пройдено ${passed}, ошибок ${failed}`);
process.exit(failed ? 1 : 0);
