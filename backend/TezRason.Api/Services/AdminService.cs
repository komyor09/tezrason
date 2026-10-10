using TezRason.Api.Common;
using TezRason.Api.Contracts;
using TezRason.Api.Data;
using TezRason.Api.Domain;

namespace TezRason.Api.Services;

/// <summary>Модуль администрирования платформы (роль super_admin).</summary>
public sealed class AdminService
{
    private readonly IAppDataContext _db;
    private readonly AuthService _auth;

    public AdminService(IAppDataContext db, AuthService auth)
    {
        _db = db;
        _auth = auth;
    }

    public IReadOnlyList<AdminRestaurantDto> Restaurants()
    {
        var monthAgo = DateTime.UtcNow.AddDays(-30);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var users = _db.Users.ToDictionary(u => u.Id);
        var plans = _db.SubscriptionPlans.ToDictionary(p => p.Id);
        var subs = _db.RestaurantSubscriptions.Where(s => s.Status == "active" && s.EndsAt >= today).ToList();
        var orders = _db.Orders.Where(o => o.CreatedAt >= monthAgo).Select(o => o.RestaurantId).ToList();

        return _db.Restaurants.OrderBy(r => r.Status == RestaurantStatuses.Pending ? 0 : 1).ThenBy(r => r.Name).ToList()
            .Select(r =>
            {
                var owner = users[r.OwnerId];
                var sub = subs.FirstOrDefault(s => s.RestaurantId == r.Id);
                return new AdminRestaurantDto(r.Id, r.Name, r.Cuisine, r.Status, owner.FullName, owner.Phone,
                    sub is null ? null : plans[sub.PlanId].Name, orders.Count(x => x == r.Id), r.Rating, r.CreatedAt);
            }).ToList();
    }

    /// <summary>Модерация: pending → active, active ↔ blocked.</summary>
    public void SetRestaurantStatus(long id, string status)
    {
        if (!RestaurantStatuses.All.Contains(status) || status == RestaurantStatuses.Pending)
            throw ApiException.BadRequest("Допустимые статусы: active, blocked");
        var r = _db.Restaurants.FirstOrDefault(x => x.Id == id) ?? throw ApiException.NotFound("Заведение не найдено");
        if (status == RestaurantStatuses.Blocked &&
            _db.Orders.Any(o => o.RestaurantId == id && OrderStatuses.Active.Contains(o.Status)))
            throw ApiException.Conflict("У заведения есть незавершённые заказы — блокировка невозможна");
        r.Status = status;
        _db.SaveChanges();
    }

    public AdminRestaurantDto CreateRestaurant(CreateRestaurantRequest req)
    {
        var owner = _auth.Register(new RegisterRequest(req.OwnerFullName, req.OwnerPhone, req.OwnerPassword, null, "ru")).User;
        var user = _db.Users.First(u => u.Id == owner.Id);
        user.RoleId = Roles.IdOf(Roles.RestaurantAdmin);

        var r = new Restaurant
        {
            OwnerId = user.Id, Name = req.Name.Trim(), Cuisine = req.Cuisine, Phone = req.Phone,
            AddressLine = req.AddressLine, Status = RestaurantStatuses.Pending,
        };
        _db.Add(r);
        _db.SaveChanges();
        if (req.PlanId is int planId && _db.SubscriptionPlans.Any(p => p.Id == planId))
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            _db.Add(new RestaurantSubscription { RestaurantId = r.Id, PlanId = planId, StartsAt = today, EndsAt = today.AddMonths(1) });
            _db.SaveChanges();
        }
        return Restaurants().First(x => x.Id == r.Id);
    }

    public UserDto CreateCourier(CreateCourierRequest req)
    {
        if (req.TransportType is not ("foot" or "bicycle" or "scooter" or "car")) throw ApiException.BadRequest("Неизвестный вид транспорта");
        var dto = _auth.Register(new RegisterRequest(req.FullName, req.Phone, req.Password, null, "ru")).User;
        var user = _db.Users.First(u => u.Id == dto.Id);
        user.RoleId = Roles.IdOf(Roles.Courier);
        _db.Add(new CourierProfile { UserId = user.Id, TransportType = req.TransportType });
        _db.SaveChanges();
        return AuthService.ToDto(user);
    }

    public IReadOnlyList<UserDto> Users(string? role) =>
        _db.Users.ToList().Where(u => role is null || Roles.ById[u.RoleId] == role).OrderBy(u => u.RoleId).ThenBy(u => u.FullName)
            .Select(AuthService.ToDto).ToList();

    public UserDto SetUserActive(long adminId, long userId, bool active)
    {
        if (adminId == userId) throw ApiException.BadRequest("Нельзя заблокировать собственную учётную запись");
        var u = _db.Users.FirstOrDefault(x => x.Id == userId) ?? throw ApiException.NotFound("Пользователь не найден");
        u.IsActive = active;
        u.UpdatedAt = DateTime.UtcNow;
        _db.SaveChanges();
        return AuthService.ToDto(u);
    }

    public IReadOnlyList<PlanDto> Plans() =>
        _db.SubscriptionPlans.OrderBy(p => p.MonthlyPrice).ToList().Select(p => new PlanDto(p.Id, p.Name, p.MonthlyPrice, p.MaxDishes, p.HasAnalytics)).ToList();
}
