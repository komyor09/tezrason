using TezRason.Api.Common;
using TezRason.Api.Contracts;
using TezRason.Api.Data;
using TezRason.Api.Domain;

namespace TezRason.Api.Services;

/// <summary>Каталог заведений и меню для клиентов.</summary>
public sealed class CatalogService
{
    private readonly IAppDataContext _db;
    public CatalogService(IAppDataContext db) => _db = db;

    /// <summary>Местное время Таджикистана (UTC+5, без перехода на летнее время).</summary>
    public static DateTime LocalNow => DateTime.UtcNow.AddHours(5);

    public IReadOnlyList<RestaurantDto> ActiveRestaurants(string? search)
    {
        var q = _db.Restaurants.Where(r => r.Status == RestaurantStatuses.Active).ToList();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            q = q.Where(r => r.Name.ToLowerInvariant().Contains(s) || (r.Cuisine ?? "").ToLowerInvariant().Contains(s)).ToList();
        }
        return q.OrderByDescending(r => r.Rating).ThenBy(r => r.Name).Select(ToDto).ToList();
    }

    public MenuDto Menu(long restaurantId, bool includeUnavailable = false)
    {
        var r = _db.Restaurants.FirstOrDefault(x => x.Id == restaurantId) ?? throw ApiException.NotFound("Заведение не найдено");
        if (r.Status != RestaurantStatuses.Active && !includeUnavailable) throw ApiException.NotFound("Заведение недоступно");

        var categories = _db.Categories.Where(c => c.RestaurantId == restaurantId).OrderBy(c => c.SortOrder).ThenBy(c => c.Id)
            .Select(c => new CategoryDto(c.Id, c.NameRu, c.NameTj, c.SortOrder)).ToList();
        var dishes = _db.Dishes.Where(d => d.RestaurantId == restaurantId && (includeUnavailable || d.IsAvailable))
            .OrderBy(d => d.Id).ToList().Select(ToDto).ToList();
        var now = DateTime.UtcNow;
        var promos = _db.Promotions.Where(p => p.RestaurantId == restaurantId && (includeUnavailable || (p.IsActive && p.StartsAt <= now && p.EndsAt >= now)))
            .ToList().Select(ToDto).ToList();
        return new MenuDto(ToDto(r), categories, dishes, promos);
    }

    /// <summary>Проверка режима работы заведения по расписанию на текущий день.</summary>
    public (bool IsOpen, string? Hours) OpenState(long restaurantId)
    {
        var local = LocalNow;
        var day = (short)(local.DayOfWeek == DayOfWeek.Sunday ? 7 : (int)local.DayOfWeek);
        var s = _db.RestaurantSchedules.FirstOrDefault(x => x.RestaurantId == restaurantId && x.DayOfWeek == day);
        if (s is null) return (true, null);                         // расписание не задано — принимаем заказы
        if (s.IsDayOff || s.OpenTime is null || s.CloseTime is null) return (false, null);
        var t = TimeOnly.FromDateTime(local);
        var open = s.OpenTime.Value <= s.CloseTime.Value
            ? t >= s.OpenTime && t <= s.CloseTime
            : t >= s.OpenTime || t <= s.CloseTime;                 // работа после полуночи
        return (open, $"{s.OpenTime:HH\\:mm}–{s.CloseTime:HH\\:mm}");
    }

    public RestaurantDto ToDto(Restaurant r)
    {
        var (open, hours) = OpenState(r.Id);
        return new RestaurantDto(r.Id, r.Name, r.DescriptionRu, r.DescriptionTj, r.Cuisine, r.Phone, r.AddressLine, r.LogoUrl,
            r.MinOrderAmount, r.DeliveryFee, r.AvgCookingMin, r.Rating, r.Status, open, hours);
    }

    public static DishDto ToDto(Dish d) => new(d.Id, d.CategoryId, d.NameRu, d.NameTj, d.DescriptionRu, d.DescriptionTj, d.Price,
        d.WeightG, d.ImageUrl, d.IsAvailable);

    public static PromotionDto ToDto(Promotion p) => new(p.Id, p.TitleRu, p.TitleTj, p.DiscountType, p.DiscountValue, p.StartsAt, p.EndsAt, p.IsActive);
}
