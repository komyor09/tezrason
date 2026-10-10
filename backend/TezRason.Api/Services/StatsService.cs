using TezRason.Api.Contracts;
using TezRason.Api.Data;
using TezRason.Api.Domain;

namespace TezRason.Api.Services;

/// <summary>Модуль статистики для администратора заведения и суперадминистратора.</summary>
public sealed class StatsService
{
    private readonly IAppDataContext _db;
    public StatsService(IAppDataContext db) => _db = db;

    /// <summary>Начало текущих суток по времени Таджикистана, выраженное в UTC.</summary>
    public static DateTime TodayStartUtc => DateTime.SpecifyKind(CatalogService.LocalNow.Date.AddHours(-5), DateTimeKind.Utc);

    public RestaurantStatsDto ForRestaurant(Restaurant r)
    {
        var orders = _db.Orders.Where(o => o.RestaurantId == r.Id).ToList();
        var delivered = orders.Where(o => o.Status == OrderStatuses.Delivered).ToList();
        var today = TodayStartUtc;
        var weekStart = today.AddDays(-6);

        var deliveredIds = delivered.Select(o => o.Id).ToList();
        var top = _db.OrderItems.Where(i => deliveredIds.Contains(i.OrderId)).ToList()
            .GroupBy(i => i.DishName).Select(g => new NamedValue(g.Key, g.Sum(x => x.Quantity)))
            .OrderByDescending(x => x.Value).Take(5).ToList();

        var byDay = Enumerable.Range(0, 7).Select(i =>
        {
            var from = weekStart.AddDays(i);
            var sum = delivered.Where(o => o.DeliveredAt >= from && o.DeliveredAt < from.AddDays(1)).Sum(o => o.Total);
            return new NamedValue(from.AddHours(5).ToString("dd.MM"), sum);
        }).ToList();

        return new RestaurantStatsDto(
            RevenueToday: delivered.Where(o => o.DeliveredAt >= today).Sum(o => o.Total),
            RevenueWeek: delivered.Where(o => o.DeliveredAt >= weekStart).Sum(o => o.Total),
            RevenueTotal: delivered.Sum(o => o.Total),
            OrdersTotal: orders.Count,
            OrdersToday: orders.Count(o => o.CreatedAt >= today),
            ActiveOrders: orders.Count(o => OrderStatuses.Active.Contains(o.Status)),
            AverageCheck: delivered.Count == 0 ? 0 : Math.Round(delivered.Average(o => o.Total), 2),
            Rating: r.Rating,
            TopDishes: top,
            RevenueByDay: byDay);
    }

    public PlatformStatsDto Platform()
    {
        var restaurants = _db.Restaurants.ToList();
        var orders = _db.Orders.ToList();
        var users = _db.Users.ToList();
        var today = TodayStartUtc;
        var statuses = new[] { OrderStatuses.New, OrderStatuses.Accepted, OrderStatuses.Cooking, OrderStatuses.Ready,
                               OrderStatuses.OnTheWay, OrderStatuses.Delivered, OrderStatuses.Cancelled };
        return new PlatformStatsDto(
            ActiveRestaurants: restaurants.Count(r => r.Status == RestaurantStatuses.Active),
            PendingRestaurants: restaurants.Count(r => r.Status == RestaurantStatuses.Pending),
            BlockedRestaurants: restaurants.Count(r => r.Status == RestaurantStatuses.Blocked),
            OrdersToday: orders.Count(o => o.CreatedAt >= today),
            OrdersTotal: orders.Count,
            RevenueTotal: orders.Where(o => o.Status == OrderStatuses.Delivered).Sum(o => o.Total),
            Clients: users.Count(u => u.RoleId == Roles.IdOf(Roles.Client)),
            Couriers: users.Count(u => u.RoleId == Roles.IdOf(Roles.Courier)),
            CouriersOnShift: _db.CourierProfiles.Count(c => c.IsAvailable),
            OrdersByStatus: statuses.Select(s => new NamedValue(s, orders.Count(o => o.Status == s))).ToList());
    }
}
