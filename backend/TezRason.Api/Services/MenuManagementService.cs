using TezRason.Api.Common;
using TezRason.Api.Contracts;
using TezRason.Api.Data;
using TezRason.Api.Domain;

namespace TezRason.Api.Services;

/// <summary>Модуль управления меню: заведение, категории, блюда, акции и расписание (роль restaurant_admin).</summary>
public sealed class MenuManagementService
{
    private readonly IAppDataContext _db;
    private readonly CatalogService _catalog;

    public MenuManagementService(IAppDataContext db, CatalogService catalog)
    {
        _db = db;
        _catalog = catalog;
    }

    /// <summary>Заведение текущего администратора (первое, если их несколько).</summary>
    public Restaurant OwnRestaurant(long ownerId) =>
        _db.Restaurants.Where(r => r.OwnerId == ownerId).OrderBy(r => r.Id).FirstOrDefault()
        ?? throw ApiException.NotFound("За вами не закреплено ни одного заведения");

    public MenuDto Menu(long ownerId) => _catalog.Menu(OwnRestaurant(ownerId).Id, includeUnavailable: true);

    public RestaurantDto UpdateRestaurant(long ownerId, RestaurantUpdateRequest r)
    {
        var x = OwnRestaurant(ownerId);
        if (string.IsNullOrWhiteSpace(r.Name)) throw ApiException.BadRequest("Название обязательно");
        if (r.MinOrderAmount < 0 || r.DeliveryFee < 0) throw ApiException.BadRequest("Суммы не могут быть отрицательными");
        x.Name = r.Name.Trim(); x.DescriptionRu = r.DescriptionRu; x.DescriptionTj = r.DescriptionTj; x.Cuisine = r.Cuisine;
        x.Phone = r.Phone; x.AddressLine = r.AddressLine; x.MinOrderAmount = r.MinOrderAmount; x.DeliveryFee = r.DeliveryFee;
        x.AvgCookingMin = r.AvgCookingMin;
        _db.SaveChanges();
        return _catalog.ToDto(x);
    }

    // ---------- Категории ----------
    public CategoryDto AddCategory(long ownerId, CategoryRequest r)
    {
        ValidateNames(r.NameRu, r.NameTj);
        var c = new Category { RestaurantId = OwnRestaurant(ownerId).Id, NameRu = r.NameRu.Trim(), NameTj = r.NameTj.Trim(), SortOrder = r.SortOrder };
        _db.Add(c);
        _db.SaveChanges();
        return new CategoryDto(c.Id, c.NameRu, c.NameTj, c.SortOrder);
    }

    public CategoryDto UpdateCategory(long ownerId, long id, CategoryRequest r)
    {
        ValidateNames(r.NameRu, r.NameTj);
        var c = OwnCategory(ownerId, id);
        c.NameRu = r.NameRu.Trim(); c.NameTj = r.NameTj.Trim(); c.SortOrder = r.SortOrder;
        _db.SaveChanges();
        return new CategoryDto(c.Id, c.NameRu, c.NameTj, c.SortOrder);
    }

    public void DeleteCategory(long ownerId, long id)
    {
        var c = OwnCategory(ownerId, id);
        if (_db.Dishes.Any(d => d.CategoryId == id)) throw ApiException.Conflict("Сначала перенесите или удалите блюда этой категории");
        _db.Remove(c);
        _db.SaveChanges();
    }

    // ---------- Блюда ----------
    public DishDto AddDish(long ownerId, DishRequest r)
    {
        var restaurant = OwnRestaurant(ownerId);
        ValidateDish(ownerId, r);
        CheckPlanLimit(restaurant.Id);
        var d = new Dish { RestaurantId = restaurant.Id };
        Apply(d, r);
        _db.Add(d);
        _db.SaveChanges();
        return CatalogService.ToDto(d);
    }

    public DishDto UpdateDish(long ownerId, long id, DishRequest r)
    {
        var d = OwnDish(ownerId, id);
        ValidateDish(ownerId, r);
        Apply(d, r);
        _db.SaveChanges();
        return CatalogService.ToDto(d);
    }

    public DishDto SetAvailability(long ownerId, long id, bool available)
    {
        var d = OwnDish(ownerId, id);
        d.IsAvailable = available;
        _db.SaveChanges();
        return CatalogService.ToDto(d);
    }

    /// <summary>Блюдо, которое уже заказывали, не удаляется физически, а скрывается (сохранение истории заказов).</summary>
    public void DeleteDish(long ownerId, long id)
    {
        var d = OwnDish(ownerId, id);
        if (_db.OrderItems.Any(i => i.DishId == id)) d.IsAvailable = false;
        else _db.Remove(d);
        _db.SaveChanges();
    }

    // ---------- Акции ----------
    public PromotionDto AddPromotion(long ownerId, PromotionRequest r)
    {
        ValidatePromotion(r);
        var p = new Promotion { RestaurantId = OwnRestaurant(ownerId).Id };
        ApplyPromo(p, r);
        _db.Add(p);
        _db.SaveChanges();
        return CatalogService.ToDto(p);
    }

    public PromotionDto UpdatePromotion(long ownerId, long id, PromotionRequest r)
    {
        ValidatePromotion(r);
        var rid = OwnRestaurant(ownerId).Id;
        var p = _db.Promotions.FirstOrDefault(x => x.Id == id && x.RestaurantId == rid) ?? throw ApiException.NotFound("Акция не найдена");
        ApplyPromo(p, r);
        _db.SaveChanges();
        return CatalogService.ToDto(p);
    }

    // ---------- Расписание ----------
    public IReadOnlyList<ScheduleDto> Schedule(long ownerId)
    {
        var rid = OwnRestaurant(ownerId).Id;
        return _db.RestaurantSchedules.Where(s => s.RestaurantId == rid).OrderBy(s => s.DayOfWeek).ToList()
            .Select(s => new ScheduleDto(s.DayOfWeek, s.OpenTime?.ToString("HH:mm"), s.CloseTime?.ToString("HH:mm"), s.IsDayOff)).ToList();
    }

    public IReadOnlyList<ScheduleDto> SaveSchedule(long ownerId, IReadOnlyList<ScheduleDto> days)
    {
        var rid = OwnRestaurant(ownerId).Id;
        foreach (var d in days)
        {
            if (d.DayOfWeek is < 1 or > 7) throw ApiException.BadRequest("День недели должен быть от 1 до 7");
            var s = _db.RestaurantSchedules.FirstOrDefault(x => x.RestaurantId == rid && x.DayOfWeek == d.DayOfWeek);
            if (s is null) { s = new RestaurantSchedule { RestaurantId = rid, DayOfWeek = d.DayOfWeek }; _db.Add(s); }
            s.IsDayOff = d.IsDayOff;
            s.OpenTime = d.IsDayOff || d.OpenTime is null ? null : TimeOnly.Parse(d.OpenTime);
            s.CloseTime = d.IsDayOff || d.CloseTime is null ? null : TimeOnly.Parse(d.CloseTime);
        }
        _db.SaveChanges();
        return Schedule(ownerId);
    }

    // ---------- Курьеры на смене (для назначения) ----------
    public IReadOnlyList<CourierInfoDto> AvailableCouriers()
    {
        var couriers = _db.CourierProfiles.Where(c => c.IsAvailable).ToList();
        var ids = couriers.Select(c => c.UserId).ToList();
        var users = _db.Users.Where(u => ids.Contains(u.Id) && u.IsActive).ToDictionary(u => u.Id);
        return couriers.Where(c => users.ContainsKey(c.UserId))
            .Select(c => new CourierInfoDto(c.Id, users[c.UserId].FullName, users[c.UserId].Phone, c.TransportType, c.Rating)).ToList();
    }

    // ---------- Вспомогательные проверки ----------
    private Category OwnCategory(long ownerId, long id)
    {
        var rid = OwnRestaurant(ownerId).Id;
        return _db.Categories.FirstOrDefault(c => c.Id == id && c.RestaurantId == rid) ?? throw ApiException.NotFound("Категория не найдена");
    }

    private Dish OwnDish(long ownerId, long id)
    {
        var rid = OwnRestaurant(ownerId).Id;
        return _db.Dishes.FirstOrDefault(d => d.Id == id && d.RestaurantId == rid) ?? throw ApiException.NotFound("Блюдо не найдено");
    }

    private void ValidateDish(long ownerId, DishRequest r)
    {
        ValidateNames(r.NameRu, r.NameTj);
        if (r.Price <= 0) throw ApiException.BadRequest("Цена должна быть больше нуля");
        OwnCategory(ownerId, r.CategoryId);
    }

    private void CheckPlanLimit(long restaurantId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var sub = _db.RestaurantSubscriptions.FirstOrDefault(s => s.RestaurantId == restaurantId && s.Status == "active" && s.EndsAt >= today);
        if (sub is null) return;
        var plan = _db.SubscriptionPlans.First(p => p.Id == sub.PlanId);
        if (plan.MaxDishes is int max && _db.Dishes.Count(d => d.RestaurantId == restaurantId) >= max)
            throw ApiException.Conflict($"Тариф «{plan.Name}» позволяет не более {max} позиций меню");
    }

    private static void ValidateNames(string ru, string tj)
    {
        if (string.IsNullOrWhiteSpace(ru) || string.IsNullOrWhiteSpace(tj))
            throw ApiException.BadRequest("Название нужно указать на русском и таджикском языках");
    }

    private static void ValidatePromotion(PromotionRequest r)
    {
        ValidateNames(r.TitleRu, r.TitleTj);
        if (r.DiscountType is not ("percent" or "fixed")) throw ApiException.BadRequest("Тип скидки: percent или fixed");
        if (r.DiscountValue <= 0 || (r.DiscountType == "percent" && r.DiscountValue > 90)) throw ApiException.BadRequest("Недопустимый размер скидки");
        if (r.EndsAt <= r.StartsAt) throw ApiException.BadRequest("Дата окончания должна быть позже даты начала");
    }

    private static void Apply(Dish d, DishRequest r)
    {
        d.CategoryId = r.CategoryId; d.NameRu = r.NameRu.Trim(); d.NameTj = r.NameTj.Trim();
        d.DescriptionRu = r.DescriptionRu; d.DescriptionTj = r.DescriptionTj; d.Price = r.Price;
        d.WeightG = r.WeightG; d.ImageUrl = r.ImageUrl; d.IsAvailable = r.IsAvailable;
    }

    private static void ApplyPromo(Promotion p, PromotionRequest r)
    {
        p.TitleRu = r.TitleRu.Trim(); p.TitleTj = r.TitleTj.Trim(); p.DiscountType = r.DiscountType; p.DiscountValue = r.DiscountValue;
        p.StartsAt = DateTime.SpecifyKind(r.StartsAt.ToUniversalTime(), DateTimeKind.Utc);
        p.EndsAt = DateTime.SpecifyKind(r.EndsAt.ToUniversalTime(), DateTimeKind.Utc);
        p.IsActive = r.IsActive;
    }
}
