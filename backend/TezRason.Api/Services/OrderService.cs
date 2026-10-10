using TezRason.Api.Common;
using TezRason.Api.Contracts;
using TezRason.Api.Data;
using TezRason.Api.Domain;

namespace TezRason.Api.Services;

/// <summary>
/// Модуль оформления и обработки заказов: создание, смена статусов по конечному автомату,
/// назначение курьера, отмена и отзывы.
/// </summary>
public sealed class OrderService
{
    private const int MaxQuantity = 50;
    private readonly IAppDataContext _db;
    private readonly CatalogService _catalog;

    public OrderService(IAppDataContext db, CatalogService catalog)
    {
        _db = db;
        _catalog = catalog;
    }

    // ===================== Алгоритм оформления заказа =====================
    public OrderDto Create(long clientId, CreateOrderRequest req)
    {
        // 1. Проверка входных данных
        if (req.Items is null || req.Items.Count == 0) throw ApiException.BadRequest("Корзина пуста");
        if (string.IsNullOrWhiteSpace(req.DeliveryAddress)) throw ApiException.BadRequest("Укажите адрес доставки");
        var phone = AuthService.NormalizePhone(req.ContactPhone);
        if (phone.Length < 9) throw ApiException.BadRequest("Укажите телефон получателя");
        var payment = req.PaymentMethod ?? "cash";
        if (payment is not ("cash" or "card_on_delivery")) throw ApiException.BadRequest("Недопустимый способ оплаты");

        // 2. Проверка заведения: активно и работает в данный момент
        var restaurant = _db.Restaurants.FirstOrDefault(r => r.Id == req.RestaurantId)
                         ?? throw ApiException.NotFound("Заведение не найдено");
        if (restaurant.Status != RestaurantStatuses.Active) throw ApiException.BadRequest("Заведение сейчас не принимает заказы");
        if (!_catalog.OpenState(restaurant.Id).IsOpen) throw ApiException.BadRequest("Заведение закрыто. Заказ можно оформить в рабочее время");

        // 3. Проверка позиций: блюда принадлежат заведению и доступны, количество в допустимых пределах
        var lines = req.Items.GroupBy(i => i.DishId).Select(g => new { DishId = g.Key, Quantity = g.Sum(x => x.Quantity) }).ToList();
        var ids = lines.Select(l => l.DishId).ToList();
        var dishes = _db.Dishes.Where(d => ids.Contains(d.Id)).ToList();
        foreach (var l in lines)
        {
            var dish = dishes.FirstOrDefault(d => d.Id == l.DishId);
            if (dish is null || dish.RestaurantId != restaurant.Id) throw ApiException.BadRequest("В корзине есть блюдо из другого заведения");
            if (!dish.IsAvailable) throw ApiException.BadRequest($"Блюдо «{dish.NameRu}» сейчас недоступно");
            if (l.Quantity < 1 || l.Quantity > MaxQuantity) throw ApiException.BadRequest($"Количество должно быть от 1 до {MaxQuantity}");
        }

        // 4. Расчёт стоимости: сумма блюд, лучшая действующая акция, доставка
        var subtotal = lines.Sum(l => dishes.First(d => d.Id == l.DishId).Price * l.Quantity);
        if (subtotal < restaurant.MinOrderAmount)
            throw ApiException.BadRequest($"Минимальная сумма заказа — {restaurant.MinOrderAmount:0.##} сомони");
        var (promotion, discount) = BestPromotion(restaurant.Id, subtotal);
        var total = subtotal - discount + restaurant.DeliveryFee;

        // 5. Сохранение заказа, позиций (с фиксацией цены) и первой записи истории
        var order = new Order
        {
            OrderNumber = "TMP-" + Guid.NewGuid().ToString("N")[..12],
            ClientId = clientId,
            RestaurantId = restaurant.Id,
            PromotionId = promotion?.Id,
            DeliveryAddress = req.DeliveryAddress.Trim(),
            ContactPhone = phone,
            Status = OrderStatuses.New,
            Subtotal = subtotal,
            Discount = discount,
            DeliveryFee = restaurant.DeliveryFee,
            Total = total,
            PaymentMethod = payment,
            Comment = string.IsNullOrWhiteSpace(req.Comment) ? null : req.Comment.Trim(),
        };
        _db.Add(order);
        _db.SaveChanges();
        order.OrderNumber = $"TR-{order.Id:000000}";

        foreach (var l in lines)
        {
            var d = dishes.First(x => x.Id == l.DishId);
            _db.Add(new OrderItem
            {
                OrderId = order.Id, DishId = d.Id, DishName = d.NameRu, UnitPrice = d.Price,
                Quantity = (short)l.Quantity, LineTotal = d.Price * l.Quantity,
            });
        }
        _db.Add(new OrderStatusHistory { OrderId = order.Id, Status = OrderStatuses.New, ChangedBy = clientId });
        _db.SaveChanges();
        return ToDto(order, Roles.Client);
    }

    private (Promotion? Promo, decimal Discount) BestPromotion(long restaurantId, decimal subtotal)
    {
        var now = DateTime.UtcNow;
        var promos = _db.Promotions.Where(p => p.RestaurantId == restaurantId && p.IsActive && p.StartsAt <= now && p.EndsAt >= now).ToList();
        Promotion? best = null;
        decimal bestDiscount = 0;
        foreach (var p in promos)
        {
            var d = p.DiscountType == "percent" ? Math.Round(subtotal * p.DiscountValue / 100m, 2) : p.DiscountValue;
            d = Math.Min(d, subtotal);
            if (d > bestDiscount) { best = p; bestDiscount = d; }
        }
        return (best, bestDiscount);
    }

    // ===================== Алгоритм смены статуса =====================
    public OrderDto ChangeStatus(long userId, string role, long orderId, string newStatus, string? comment)
    {
        var order = Load(orderId);
        EnsureAccess(userId, role, order);

        if (!OrderStatusMachine.CanTransition(order.Status, newStatus, role))
            throw ApiException.Conflict($"Переход «{order.Status} → {newStatus}» недоступен для роли {role}");

        if (newStatus == OrderStatuses.Ready && order.CourierId is null)
            throw ApiException.BadRequest("Перед статусом «Готов к выдаче» необходимо назначить курьера");
        if (newStatus == OrderStatuses.Cancelled && string.IsNullOrWhiteSpace(comment) && role == Roles.RestaurantAdmin)
            throw ApiException.BadRequest("Укажите причину отмены");

        order.Status = newStatus;
        if (newStatus == OrderStatuses.Delivered) order.DeliveredAt = DateTime.UtcNow;
        _db.Add(new OrderStatusHistory { OrderId = order.Id, Status = newStatus, ChangedBy = userId, Comment = comment });
        _db.SaveChanges();
        return ToDto(order, role);
    }

    public OrderDto AssignCourier(long adminId, long orderId, long courierProfileId)
    {
        var order = Load(orderId);
        EnsureAccess(adminId, Roles.RestaurantAdmin, order);
        if (order.Status is not (OrderStatuses.Accepted or OrderStatuses.Cooking or OrderStatuses.Ready))
            throw ApiException.Conflict("Курьера можно назначить только принятому заказу до передачи в доставку");

        var courier = _db.CourierProfiles.FirstOrDefault(c => c.Id == courierProfileId) ?? throw ApiException.NotFound("Курьер не найден");
        var user = _db.Users.First(u => u.Id == courier.UserId);
        if (!user.IsActive || !courier.IsAvailable) throw ApiException.BadRequest("Курьер сейчас не на смене");

        order.CourierId = courier.Id;
        _db.Add(new OrderStatusHistory { OrderId = order.Id, Status = order.Status, ChangedBy = adminId, Comment = $"Назначен курьер: {user.FullName}" });
        _db.SaveChanges();
        return ToDto(order, Roles.RestaurantAdmin);
    }

    public OrderDto AddReview(long clientId, long orderId, ReviewRequest r)
    {
        var order = Load(orderId);
        if (order.ClientId != clientId) throw ApiException.Forbidden("Это не ваш заказ");
        if (order.Status != OrderStatuses.Delivered) throw ApiException.BadRequest("Отзыв можно оставить только после доставки");
        if (_db.Reviews.Any(x => x.OrderId == orderId)) throw ApiException.Conflict("Отзыв на этот заказ уже оставлен");
        if (r.FoodRating is < 1 or > 5 || r.DeliveryRating is < 1 or > 5) throw ApiException.BadRequest("Оценка должна быть от 1 до 5");

        _db.Add(new Review
        {
            OrderId = orderId, ClientId = clientId, RestaurantId = order.RestaurantId,
            FoodRating = r.FoodRating, DeliveryRating = r.DeliveryRating, Comment = r.Comment?.Trim(),
        });
        _db.SaveChanges();

        // Пересчёт средних оценок заведения и курьера
        var restaurant = _db.Restaurants.First(x => x.Id == order.RestaurantId);
        restaurant.Rating = Math.Round((decimal)_db.Reviews.Where(x => x.RestaurantId == restaurant.Id).Select(x => (double)x.FoodRating).Average(), 2);
        if (order.CourierId is long cid)
        {
            var orderIds = _db.Orders.Where(o => o.CourierId == cid).Select(o => o.Id).ToList();
            var ratings = _db.Reviews.Where(x => orderIds.Contains(x.OrderId)).Select(x => (double)x.DeliveryRating).ToList();
            var courier = _db.CourierProfiles.First(c => c.Id == cid);
            if (ratings.Count > 0) courier.Rating = Math.Round((decimal)ratings.Average(), 2);
        }
        _db.SaveChanges();
        return ToDto(order, Roles.Client);
    }

    // ===================== Выборки =====================
    public IReadOnlyList<OrderDto> ForClient(long clientId) =>
        _db.Orders.Where(o => o.ClientId == clientId).OrderByDescending(o => o.CreatedAt).ToList().Select(o => ToDto(o, Roles.Client)).ToList();

    public IReadOnlyList<OrderDto> ForRestaurant(long restaurantId, string? status)
    {
        var q = _db.Orders.Where(o => o.RestaurantId == restaurantId);
        if (status == "active") q = q.Where(o => OrderStatuses.Active.Contains(o.Status));
        else if (!string.IsNullOrEmpty(status)) q = q.Where(o => o.Status == status);
        return q.OrderByDescending(o => o.CreatedAt).Take(200).ToList().Select(o => ToDto(o, Roles.RestaurantAdmin)).ToList();
    }

    public IReadOnlyList<OrderDto> ForCourier(long courierProfileId, bool active)
    {
        var q = _db.Orders.Where(o => o.CourierId == courierProfileId);
        q = active
            ? q.Where(o => o.Status == OrderStatuses.Accepted || o.Status == OrderStatuses.Cooking || o.Status == OrderStatuses.Ready || o.Status == OrderStatuses.OnTheWay)
            : q.Where(o => o.Status == OrderStatuses.Delivered);
        return q.OrderByDescending(o => o.CreatedAt).Take(100).ToList().Select(o => ToDto(o, Roles.Courier)).ToList();
    }

    public OrderDto Get(long userId, string role, long orderId)
    {
        var order = Load(orderId);
        EnsureAccess(userId, role, order);
        return ToDto(order, role);
    }

    private Order Load(long id) => _db.Orders.FirstOrDefault(o => o.Id == id) ?? throw ApiException.NotFound("Заказ не найден");

    /// <summary>Проверка прав: каждая роль видит только «свои» заказы.</summary>
    private void EnsureAccess(long userId, string role, Order order)
    {
        var ok = role switch
        {
            Roles.Client => order.ClientId == userId,
            Roles.RestaurantAdmin => _db.Restaurants.Any(r => r.Id == order.RestaurantId && r.OwnerId == userId),
            Roles.Courier => _db.CourierProfiles.Any(c => c.UserId == userId && c.Id == order.CourierId),
            Roles.SuperAdmin => true,
            _ => false,
        };
        if (!ok) throw ApiException.Forbidden("Нет доступа к заказу");
    }

    public OrderDto ToDto(Order o, string role)
    {
        var restaurant = _db.Restaurants.First(r => r.Id == o.RestaurantId);
        var client = _db.Users.First(u => u.Id == o.ClientId);
        CourierInfoDto? courier = null;
        if (o.CourierId is long cid)
        {
            var cp = _db.CourierProfiles.First(c => c.Id == cid);
            var cu = _db.Users.First(u => u.Id == cp.UserId);
            courier = new CourierInfoDto(cp.Id, cu.FullName, cu.Phone, cp.TransportType, cp.Rating);
        }
        var items = _db.OrderItems.Where(i => i.OrderId == o.Id).OrderBy(i => i.Id).ToList()
            .Select(i => new OrderItemDto(i.DishId, i.DishName, i.UnitPrice, i.Quantity, i.LineTotal)).ToList();
        var history = _db.OrderStatusHistory.Where(h => h.OrderId == o.Id).OrderBy(h => h.ChangedAt).ThenBy(h => h.Id).ToList();
        var userIds = history.Where(h => h.ChangedBy != null).Select(h => h.ChangedBy!.Value).Distinct().ToList();
        var names = _db.Users.Where(u => userIds.Contains(u.Id)).ToDictionary(u => u.Id, u => u.FullName);
        var historyDto = history.Select(h => new StatusHistoryDto(h.Status, h.ChangedAt,
            h.ChangedBy is long id && names.TryGetValue(id, out var n) ? n : null, h.Comment)).ToList();

        return new OrderDto(o.Id, o.OrderNumber, o.Status, restaurant.Id, restaurant.Name, restaurant.AddressLine, client.Id, client.FullName,
            o.DeliveryAddress, o.ContactPhone, o.Subtotal, o.Discount, o.DeliveryFee, o.Total, o.PaymentMethod, o.Comment, o.CreatedAt,
            o.DeliveredAt, courier, items, historyDto, OrderStatusMachine.NextFor(o.Status, role).ToList(),
            _db.Reviews.Any(r => r.OrderId == o.Id));
    }
}
