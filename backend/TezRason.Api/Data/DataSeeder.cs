using TezRason.Api.Domain;
using TezRason.Api.Services;

namespace TezRason.Api.Data;

/// <summary>
/// Начальное заполнение базы демонстрационными данными (выполняется, если таблица ролей пуста).
/// Все демо-пароли: 123456. Телефоны учётных записей приведены в README.md.
/// </summary>
public static class DataSeeder
{
    public const string DemoPassword = "123456";

    public static void Seed(IAppDataContext db, AuthService auth)
    {
        if (!db.IsEmpty()) return;
        var hash = auth.HashPassword(DemoPassword);

        // ---------- Роли и тарифы ----------
        db.Add(new Role { Id = 1, Code = Roles.Client, NameRu = "Клиент", NameTj = "Мизоҷ" });
        db.Add(new Role { Id = 2, Code = Roles.Courier, NameRu = "Курьер", NameTj = "Курйер" });
        db.Add(new Role { Id = 3, Code = Roles.RestaurantAdmin, NameRu = "Администратор заведения", NameTj = "Маъмури муассиса" });
        db.Add(new Role { Id = 4, Code = Roles.SuperAdmin, NameRu = "Суперадминистратор", NameTj = "Суперадминистратор" });
        var start = new SubscriptionPlan { Name = "Старт", MonthlyPrice = 150, MaxDishes = 30, HasAnalytics = false };
        var business = new SubscriptionPlan { Name = "Бизнес", MonthlyPrice = 350, MaxDishes = null, HasAnalytics = true };
        db.Add(start); db.Add(business);
        db.SaveChanges();

        User U(string name, string phone, string role)
        {
            var u = new User { FullName = name, Phone = phone, RoleId = Roles.IdOf(role), PasswordHash = hash };
            db.Add(u);
            return u;
        }

        // ---------- Пользователи ----------
        U("Администратор TezRason", "+992900000000", Roles.SuperAdmin);
        var clients = new[] { U("Шахноза Каримова", "+992900000001", Roles.Client), U("Бехруз Саидов", "+992900000002", Roles.Client) };
        var admins = new[]
        {
            U("Далер Рахимов", "+992910000001", Roles.RestaurantAdmin), U("Сино Назаров", "+992910000002", Roles.RestaurantAdmin),
            U("Азиза Каримова", "+992910000003", Roles.RestaurantAdmin), U("Тимур Ахмедов", "+992910000004", Roles.RestaurantAdmin),
            U("Фаридун Юсупов", "+992910000005", Roles.RestaurantAdmin), U("Мадина Шарипова", "+992910000006", Roles.RestaurantAdmin),
        };
        var courierUsers = new[] { U("Фаррух Алиев", "+992920000001", Roles.Courier), U("Зафар Ғафуров", "+992920000002", Roles.Courier),
                                   U("Сухроб Мирзоев", "+992920000003", Roles.Courier) };
        db.SaveChanges();

        var couriers = new[]
        {
            new CourierProfile { UserId = courierUsers[0].Id, TransportType = "scooter", IsAvailable = true, Rating = 4.9m },
            new CourierProfile { UserId = courierUsers[1].Id, TransportType = "car", IsAvailable = true, Rating = 4.8m },
            new CourierProfile { UserId = courierUsers[2].Id, TransportType = "bicycle", IsAvailable = false, Rating = 4.7m },
        };
        foreach (var c in couriers) db.Add(c);
        db.Add(new Address { UserId = clients[0].Id, Title = "Дом", AddressLine = "ул. Камоли Худжанди, 12", Apartment = "кв. 34", IsDefault = true });
        db.Add(new Address { UserId = clients[1].Id, Title = "Дом", AddressLine = "19-мкр, дом 6", Apartment = "кв. 51", IsDefault = true });

        // ---------- Заведения ----------
        Restaurant R(User owner, string name, string cuisine, string addr, string descRu, string descTj, decimal min, decimal fee,
                     short cook, string status, Plan plan)
        {
            var r = new Restaurant
            {
                OwnerId = owner.Id, Name = name, Cuisine = cuisine, AddressLine = addr, Phone = "+99292" + (7000000 + owner.Id),
                DescriptionRu = descRu, DescriptionTj = descTj, MinOrderAmount = min, DeliveryFee = fee, AvgCookingMin = cook,
                Status = status, CreatedAt = DateTime.UtcNow.AddDays(-60),
            };
            db.Add(r);
            db.SaveChanges();
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            db.Add(new RestaurantSubscription
            {
                RestaurantId = r.Id, PlanId = plan == Plan.Business ? business.Id : start.Id,
                StartsAt = today.AddDays(-20), EndsAt = today.AddDays(10),
            });
            return r;
        }

        var chaikhona = R(admins[0], "Чайхона №1", "Таджикская кухня", "ул. Ленина, 45",
            "Традиционная таджикская кухня: плов, шурбо, манту и свежая самбуса из тандыра.",
            "Таомҳои анъанавии тоҷикӣ: палав, шӯрбо, манту ва сомсаи тозаи тандурӣ.", 50, 10, 35, RestaurantStatuses.Active, Plan.Business);
        var pizza = R(admins[1], "Пицца Маэстро", "Итальянская кухня", "пр. Исмоили Сомони, 8",
            "Пицца на тонком тесте из печи и паста.", "Питсаи тунук аз танӯр ва паста.", 40, 12, 25, RestaurantStatuses.Active, Plan.Business);
        var plov = R(admins[2], "Плов Сити", "Узбекская кухня", "ул. Гагарина, 120",
            "Плов по-ферганьски и шашлыки на углях.", "Палави фарғонагӣ ва кабоб дар оташ.", 45, 10, 40, RestaurantStatuses.Active, Plan.Start);
        var sushi = R(admins[3], "Суши Бар Токио", "Японская кухня", "ул. Мавлонбекова, 3",
            "Роллы и суши из свежих продуктов.", "Роллҳо ва сушӣ аз маҳсулоти тоза.", 60, 15, 45, RestaurantStatuses.Active, Plan.Start);
        R(admins[4], "Бургер Хаус", "Фастфуд", "ул. Ленина, 200", "Бургеры и картофель фри.", "Бургер ва картошкаи фри.",
            30, 10, 20, RestaurantStatuses.Pending, Plan.Start);
        R(admins[5], "Кофе Экспресс", "Кафе", "пр. Ленина, 5", "Кофе и десерты.", "Қаҳва ва десертҳо.",
            20, 8, 15, RestaurantStatuses.Blocked, Plan.Start);

        // Расписание: Плов Сити работает 09:00–22:00 с выходным в понедельник, остальные — круглосуточно (демо)
        foreach (var r in new[] { chaikhona, pizza, sushi })
            for (short d = 1; d <= 7; d++)
                db.Add(new RestaurantSchedule { RestaurantId = r.Id, DayOfWeek = d, OpenTime = new TimeOnly(0, 0), CloseTime = new TimeOnly(23, 59) });
        for (short d = 1; d <= 7; d++)
            db.Add(new RestaurantSchedule { RestaurantId = plov.Id, DayOfWeek = d, IsDayOff = d == 1,
                OpenTime = d == 1 ? null : new TimeOnly(9, 0), CloseTime = d == 1 ? null : new TimeOnly(22, 0) });

        // ---------- Меню ----------
        var dishes = new Dictionary<string, Dish>();
        void Menu(Restaurant r, params (string catRu, string catTj, (string ru, string tj, string desc, decimal price, int w)[] items)[] cats)
        {
            short order = 0;
            foreach (var (catRu, catTj, items) in cats)
            {
                var c = new Category { RestaurantId = r.Id, NameRu = catRu, NameTj = catTj, SortOrder = order++ };
                db.Add(c);
                db.SaveChanges();
                foreach (var (ru, tj, desc, price, w) in items)
                {
                    var d = new Dish { RestaurantId = r.Id, CategoryId = c.Id, NameRu = ru, NameTj = tj, DescriptionRu = desc,
                                       DescriptionTj = desc, Price = price, WeightG = w };
                    db.Add(d);
                    dishes[$"{r.Id}:{ru}"] = d;
                }
            }
        }

        Menu(chaikhona,
            ("Горячие блюда", "Хӯрокҳои гарм", new[]
            {
                ("Плов ош", "Оши палав", "Рис, говядина, морковь, нут", 35m, 400),
                ("Шурбо", "Шӯрбо", "Суп из баранины с овощами", 28m, 450),
                ("Манту (5 шт.)", "Манту (5 дона)", "Тесто, говядина, лук", 30m, 350),
                ("Лагман", "Лағмон", "Домашняя лапша, мясо, овощи", 32m, 400),
            }),
            ("Шашлыки", "Кабобҳо", new[]
            {
                ("Кабоб из баранины", "Кабоби гӯсфандӣ", "Шашлык на мангале", 40m, 200),
                ("Шашлык из курицы", "Кабоби мурғ", "Куриное бедро на мангале", 25m, 200),
            }),
            ("Выпечка", "Нонӣ", new[]
            {
                ("Самбуса с мясом", "Сомсаи гӯштӣ", "Тандырная выпечка", 8m, 120),
                ("Лепёшка тандырная", "Нони тандурӣ", "Свежий хлеб из тандыра", 4m, 250),
            }),
            ("Напитки", "Нӯшокиҳо", new[]
            {
                ("Зелёный чай (чайник)", "Чойи кабуд (чойник)", "Чайник 0,8 л", 5m, 800),
                ("Компот", "Компот", "Домашний компот 0,5 л", 7m, 500),
            }));
        Menu(pizza,
            ("Пицца", "Питса", new[]
            {
                ("Маргарита", "Маргарита", "Томатный соус, моцарелла, базилик", 45m, 450),
                ("Пепперони", "Пепперонӣ", "Пепперони, моцарелла", 55m, 480),
                ("Четыре сыра", "Чор панир", "Моцарелла, пармезан, дор блю, чеддер", 60m, 470),
            }),
            ("Паста", "Паста", new[] { ("Карбонара", "Карбонара", "Спагетти, сливочный соус, бекон из говядины", 42m, 320) }),
            ("Напитки", "Нӯшокиҳо", new[] { ("Лимонад", "Лимонад", "Домашний лимонад 0,5 л", 12m, 500) }));
        Menu(plov,
            ("Плов", "Палав", new[]
            {
                ("Плов ферганский", "Палави фарғонагӣ", "Девзира, баранина, перепелиное яйцо", 38m, 400),
                ("Плов свадебный", "Оши тӯёна", "С изюмом и казы", 45m, 420),
            }),
            ("Шашлыки", "Кабобҳо", new[] { ("Люля-кебаб", "Люля-кабоб", "Рубленая баранина", 30m, 200) }),
            ("Салаты", "Салатҳо", new[] { ("Ачичук", "Шакароб", "Помидоры, лук, зелень", 12m, 250) }));
        Menu(sushi,
            ("Роллы", "Роллҳо", new[]
            {
                ("Филадельфия", "Филаделфия", "Лосось, сливочный сыр, огурец", 75m, 260),
                ("Калифорния", "Калифорния", "Краб, авокадо, икра масаго", 65m, 250),
            }),
            ("Супы", "Шӯрбоҳо", new[] { ("Мисо-суп", "Шӯрбои мисо", "Тофу, водоросли вакаме", 25m, 300) }));
        db.SaveChanges();

        db.Add(new Promotion
        {
            RestaurantId = pizza.Id, TitleRu = "Скидка 10% на всё меню", TitleTj = "10% тахфиф барои тамоми меню",
            DiscountType = "percent", DiscountValue = 10, StartsAt = DateTime.UtcNow.AddDays(-3), EndsAt = DateTime.UtcNow.AddDays(30),
        });

        // ---------- История заказов за неделю (для статистики) ----------
        var rnd = new Random(42);
        var menuOf = new Dictionary<long, List<Dish>>
        {
            [chaikhona.Id] = dishes.Values.Where(d => d.RestaurantId == chaikhona.Id).ToList(),
            [pizza.Id] = dishes.Values.Where(d => d.RestaurantId == pizza.Id).ToList(),
            [plov.Id] = dishes.Values.Where(d => d.RestaurantId == plov.Id).ToList(),
            [sushi.Id] = dishes.Values.Where(d => d.RestaurantId == sushi.Id).ToList(),
        };
        var reviewTexts = new[] { "Очень вкусно, спасибо!", "Курьер приехал быстро", "Всё горячее, рекомендую", null };
        var number = 0;
        for (var day = 6; day >= 0; day--)
        {
            foreach (var r in new[] { chaikhona, chaikhona, chaikhona, pizza, pizza, plov, sushi })
            {
                if (day == 0 && rnd.Next(3) == 0) continue;
                var created = DateTime.UtcNow.Date.AddDays(-day).AddHours(5 + rnd.Next(4, 12)).AddMinutes(rnd.Next(60));
                if (created > DateTime.UtcNow) created = DateTime.UtcNow.AddHours(-2);
                var client = clients[rnd.Next(clients.Length)];
                var courier = couriers[rnd.Next(2)];
                var items = menuOf[r.Id].OrderBy(_ => rnd.Next()).Take(rnd.Next(1, 4)).Select(d => (d, q: (short)rnd.Next(1, 3))).ToList();
                var subtotal = items.Sum(x => x.d.Price * x.q);
                var o = new Order
                {
                    OrderNumber = $"TR-{++number:000000}", ClientId = client.Id, RestaurantId = r.Id, CourierId = courier.Id,
                    DeliveryAddress = client.Id == clients[0].Id ? "ул. Камоли Худжанди, 12, кв. 34" : "19-мкр, дом 6, кв. 51",
                    ContactPhone = client.Phone, Status = OrderStatuses.Delivered, Subtotal = subtotal, DeliveryFee = r.DeliveryFee,
                    Total = subtotal + r.DeliveryFee, PaymentMethod = rnd.Next(4) == 0 ? "card_on_delivery" : "cash",
                    CreatedAt = created, DeliveredAt = created.AddMinutes(45 + rnd.Next(20)),
                };
                db.Add(o);
                db.SaveChanges();
                foreach (var (d, q) in items)
                    db.Add(new OrderItem { OrderId = o.Id, DishId = d.Id, DishName = d.NameRu, UnitPrice = d.Price, Quantity = q, LineTotal = d.Price * q });
                var steps = new[] { (OrderStatuses.New, 0, client.Id), (OrderStatuses.Accepted, 2, r.OwnerId), (OrderStatuses.Cooking, 3, r.OwnerId),
                                    (OrderStatuses.Ready, 25, r.OwnerId), (OrderStatuses.OnTheWay, 28, courier.UserId), (OrderStatuses.Delivered, 50, courier.UserId) };
                foreach (var (st, min, by) in steps)
                    db.Add(new OrderStatusHistory { OrderId = o.Id, Status = st, ChangedBy = by, ChangedAt = created.AddMinutes(min) });
                if (rnd.Next(2) == 0)
                    db.Add(new Review { OrderId = o.Id, ClientId = client.Id, RestaurantId = r.Id, FoodRating = (short)rnd.Next(4, 6),
                                        DeliveryRating = (short)rnd.Next(4, 6), Comment = reviewTexts[rnd.Next(reviewTexts.Length)], CreatedAt = o.DeliveredAt!.Value });
            }
        }
        db.SaveChanges();

        // Рейтинги по отзывам
        foreach (var r in new[] { chaikhona, pizza, plov, sushi })
        {
            var rs = db.Reviews.Where(x => x.RestaurantId == r.Id).Select(x => (double)x.FoodRating).ToList();
            r.Rating = rs.Count == 0 ? 0 : Math.Round((decimal)rs.Average(), 2);
        }
        db.SaveChanges();
    }

    private enum Plan { Start, Business }
}
