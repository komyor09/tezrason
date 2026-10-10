-- TezRason: схема базы данных (PostgreSQL 16)

-- Роли пользователей
CREATE TABLE roles (
    id SMALLINT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name_ru VARCHAR(60) NOT NULL,
    name_tj VARCHAR(60) NOT NULL
);

-- Учётные записи пользователей
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    role_id SMALLINT REFERENCES roles(id) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(120) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    language CHAR(2) NOT NULL DEFAULT 'ru' CHECK (language IN ('ru','tj')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Адреса доставки клиентов
CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(50),
    address_line VARCHAR(255) NOT NULL,
    apartment VARCHAR(20),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

-- Профили курьеров
CREATE TABLE courier_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) NOT NULL UNIQUE,
    transport_type VARCHAR(20) NOT NULL CHECK (transport_type IN ('foot','bicycle','scooter','car')),
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    rating NUMERIC(3,2) NOT NULL DEFAULT 5.00
);

-- Тарифные планы для заведений
CREATE TABLE subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(60) NOT NULL UNIQUE,
    monthly_price NUMERIC(10,2) NOT NULL CHECK (monthly_price >= 0),
    max_dishes INTEGER,
    has_analytics BOOLEAN NOT NULL DEFAULT FALSE
);

-- Заведения общественного питания
CREATE TABLE restaurants (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT REFERENCES users(id) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description_ru TEXT,
    description_tj TEXT,
    cuisine VARCHAR(60),
    phone VARCHAR(20) NOT NULL,
    address_line VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255),
    min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    avg_cooking_min SMALLINT NOT NULL DEFAULT 30,
    rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Подписки заведений на тарифы
CREATE TABLE restaurant_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT REFERENCES restaurants(id) NOT NULL,
    plan_id INTEGER REFERENCES subscription_plans(id) NOT NULL,
    starts_at DATE NOT NULL,
    ends_at DATE NOT NULL CHECK (ends_at > starts_at),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active','expired','cancelled'))
);

-- Расписание работы заведений
CREATE TABLE restaurant_schedules (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    open_time TIME,
    close_time TIME,
    is_day_off BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (restaurant_id, day_of_week)
);

-- Категории меню
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT REFERENCES restaurants(id) ON DELETE CASCADE NOT NULL,
    name_ru VARCHAR(80) NOT NULL,
    name_tj VARCHAR(80) NOT NULL,
    sort_order SMALLINT NOT NULL DEFAULT 0
);

-- Блюда (позиции меню)
CREATE TABLE dishes (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT REFERENCES restaurants(id) NOT NULL,
    category_id BIGINT REFERENCES categories(id) NOT NULL,
    name_ru VARCHAR(120) NOT NULL,
    name_tj VARCHAR(120) NOT NULL,
    description_ru TEXT,
    description_tj TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price > 0),
    weight_g INTEGER,
    image_url VARCHAR(255),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Акции заведений
CREATE TABLE promotions (
    id BIGSERIAL PRIMARY KEY,
    restaurant_id BIGINT REFERENCES restaurants(id) NOT NULL,
    title_ru VARCHAR(120) NOT NULL,
    title_tj VARCHAR(120) NOT NULL,
    discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('percent','fixed')),
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (ends_at > starts_at)
);

-- Заказы
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(20) NOT NULL UNIQUE,
    client_id BIGINT REFERENCES users(id) NOT NULL,
    restaurant_id BIGINT REFERENCES restaurants(id) NOT NULL,
    courier_id BIGINT REFERENCES courier_profiles(id),
    promotion_id BIGINT REFERENCES promotions(id),
    delivery_address VARCHAR(300) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(10,2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','card_on_delivery')),
    comment VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    CHECK (status IN ('new','accepted','cooking','ready','on_the_way','delivered','cancelled'))
);

-- Позиции заказа
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    dish_id BIGINT REFERENCES dishes(id) NOT NULL,
    dish_name VARCHAR(120) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price > 0),
    quantity SMALLINT NOT NULL CHECK (quantity > 0),
    line_total NUMERIC(10,2) NOT NULL
);

-- История изменения статусов заказа
CREATE TABLE order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(20) NOT NULL,
    changed_by BIGINT REFERENCES users(id),
    comment VARCHAR(255),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (status IN ('new','accepted','cooking','ready','on_the_way','delivered','cancelled'))
);

-- Отзывы клиентов
CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) NOT NULL UNIQUE,
    client_id BIGINT REFERENCES users(id) NOT NULL,
    restaurant_id BIGINT REFERENCES restaurants(id) NOT NULL,
    food_rating SMALLINT NOT NULL CHECK (food_rating BETWEEN 1 AND 5),
    delivery_rating SMALLINT NOT NULL CHECK (delivery_rating BETWEEN 1 AND 5),
    comment VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для частых выборок
CREATE INDEX ix_dishes_restaurant ON dishes(restaurant_id, category_id) WHERE is_available;
CREATE INDEX ix_orders_client ON orders(client_id, created_at DESC);
CREATE INDEX ix_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX ix_orders_courier_status ON orders(courier_id, status);
CREATE INDEX ix_order_items_order ON order_items(order_id);
CREATE INDEX ix_status_history_order ON order_status_history(order_id, changed_at);
CREATE INDEX ix_reviews_restaurant ON reviews(restaurant_id);
CREATE UNIQUE INDEX ux_addresses_default ON addresses(user_id) WHERE is_default;
