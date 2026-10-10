using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TezRason.Api.Auth;
using TezRason.Api.Common;
using TezRason.Api.Contracts;
using TezRason.Api.Data;
using TezRason.Api.Domain;
using TezRason.Api.Services;

namespace TezRason.Api.Controllers;

// ======================================================================
// Аутентификация: регистрация, вход, профиль
// ======================================================================
[ApiController, Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    public AuthController(AuthService auth) => _auth = auth;

    [HttpPost("register")] public AuthResponse Register(RegisterRequest r) => _auth.Register(r);
    [HttpPost("login")] public AuthResponse Login(LoginRequest r) => _auth.Login(r);
    [Authorize, HttpGet("me")] public UserDto Me() => _auth.Me(User.UserId());
    [Authorize, HttpPut("language")] public UserDto Language(LanguageRequest r) => _auth.SetLanguage(User.UserId(), r.Language);
}

// ======================================================================
// Каталог заведений и меню (доступен без входа)
// ======================================================================
[ApiController, Route("api/restaurants")]
public sealed class RestaurantsController : ControllerBase
{
    private readonly CatalogService _catalog;
    public RestaurantsController(CatalogService catalog) => _catalog = catalog;

    [HttpGet] public IReadOnlyList<RestaurantDto> List([FromQuery] string? search) => _catalog.ActiveRestaurants(search);
    [HttpGet("{id:long}/menu")] public MenuDto Menu(long id) => _catalog.Menu(id);
}

// ======================================================================
// Заказы клиента
// ======================================================================
[ApiController, Route("api/orders"), Authorize]
public sealed class OrdersController : ControllerBase
{
    private readonly OrderService _orders;
    public OrdersController(OrderService orders) => _orders = orders;

    [HttpPost, Authorize(Roles = Roles.Client)]
    public OrderDto Create(CreateOrderRequest r) => _orders.Create(User.UserId(), r);

    [HttpGet("my"), Authorize(Roles = Roles.Client)]
    public IReadOnlyList<OrderDto> My() => _orders.ForClient(User.UserId());

    [HttpGet("{id:long}")]
    public OrderDto Get(long id) => _orders.Get(User.UserId(), User.RoleCode(), id);

    [HttpPost("{id:long}/cancel"), Authorize(Roles = Roles.Client)]
    public OrderDto Cancel(long id) => _orders.ChangeStatus(User.UserId(), Roles.Client, id, OrderStatuses.Cancelled, "Отменён клиентом");

    [HttpPost("{id:long}/review"), Authorize(Roles = Roles.Client)]
    public OrderDto Review(long id, ReviewRequest r) => _orders.AddReview(User.UserId(), id, r);
}

// ======================================================================
// Панель администратора заведения
// ======================================================================
[ApiController, Route("api/manage"), Authorize(Roles = Roles.RestaurantAdmin)]
public sealed class ManageController : ControllerBase
{
    private readonly MenuManagementService _menu;
    private readonly OrderService _orders;
    private readonly StatsService _stats;

    public ManageController(MenuManagementService menu, OrderService orders, StatsService stats)
    {
        _menu = menu;
        _orders = orders;
        _stats = stats;
    }

    private long Me => User.UserId();

    [HttpGet("menu")] public MenuDto Menu() => _menu.Menu(Me);
    [HttpPut("restaurant")] public RestaurantDto UpdateRestaurant(RestaurantUpdateRequest r) => _menu.UpdateRestaurant(Me, r);

    [HttpPost("categories")] public CategoryDto AddCategory(CategoryRequest r) => _menu.AddCategory(Me, r);
    [HttpPut("categories/{id:long}")] public CategoryDto UpdateCategory(long id, CategoryRequest r) => _menu.UpdateCategory(Me, id, r);
    [HttpDelete("categories/{id:long}")] public IActionResult DeleteCategory(long id) { _menu.DeleteCategory(Me, id); return NoContent(); }

    [HttpPost("dishes")] public DishDto AddDish(DishRequest r) => _menu.AddDish(Me, r);
    [HttpPut("dishes/{id:long}")] public DishDto UpdateDish(long id, DishRequest r) => _menu.UpdateDish(Me, id, r);
    [HttpPatch("dishes/{id:long}/availability")] public DishDto Availability(long id, [FromQuery] bool available) => _menu.SetAvailability(Me, id, available);
    [HttpDelete("dishes/{id:long}")] public IActionResult DeleteDish(long id) { _menu.DeleteDish(Me, id); return NoContent(); }

    [HttpPost("promotions")] public PromotionDto AddPromotion(PromotionRequest r) => _menu.AddPromotion(Me, r);
    [HttpPut("promotions/{id:long}")] public PromotionDto UpdatePromotion(long id, PromotionRequest r) => _menu.UpdatePromotion(Me, id, r);

    [HttpGet("schedule")] public IReadOnlyList<ScheduleDto> Schedule() => _menu.Schedule(Me);
    [HttpPut("schedule")] public IReadOnlyList<ScheduleDto> SaveSchedule(List<ScheduleDto> days) => _menu.SaveSchedule(Me, days);

    [HttpGet("orders")] public IReadOnlyList<OrderDto> Orders([FromQuery] string? status) => _orders.ForRestaurant(_menu.OwnRestaurant(Me).Id, status);
    [HttpPost("orders/{id:long}/status")] public OrderDto Status(long id, ChangeStatusRequest r) => _orders.ChangeStatus(Me, Roles.RestaurantAdmin, id, r.Status, r.Comment);
    [HttpPost("orders/{id:long}/courier")] public OrderDto Assign(long id, AssignCourierRequest r) => _orders.AssignCourier(Me, id, r.CourierId);
    [HttpGet("couriers")] public IReadOnlyList<CourierInfoDto> Couriers() => _menu.AvailableCouriers();

    [HttpGet("stats")] public RestaurantStatsDto Stats() => _stats.ForRestaurant(_menu.OwnRestaurant(Me));
}

// ======================================================================
// Панель курьера
// ======================================================================
[ApiController, Route("api/courier"), Authorize(Roles = Roles.Courier)]
public sealed class CourierController : ControllerBase
{
    private readonly IAppDataContext _db;
    private readonly OrderService _orders;

    public CourierController(IAppDataContext db, OrderService orders)
    {
        _db = db;
        _orders = orders;
    }

    private CourierProfile Profile() =>
        _db.CourierProfiles.FirstOrDefault(c => c.UserId == User.UserId()) ?? throw ApiException.NotFound("Профиль курьера не найден");

    [HttpGet("profile")]
    public CourierProfileDto GetProfile()
    {
        var p = Profile();
        var u = _db.Users.First(x => x.Id == p.UserId);
        var todayStart = StatsService.TodayStartUtc;
        var delivered = _db.Orders.Where(o => o.CourierId == p.Id && o.Status == OrderStatuses.Delivered && o.DeliveredAt >= todayStart).ToList();
        var active = _db.Orders.Count(o => o.CourierId == p.Id && (o.Status == OrderStatuses.Ready || o.Status == OrderStatuses.OnTheWay));
        return new CourierProfileDto(p.Id, u.FullName, u.Phone, p.TransportType, p.IsAvailable, p.Rating, delivered.Count,
            delivered.Where(o => o.PaymentMethod == "cash").Sum(o => o.Total), active);
    }

    [HttpPut("shift")]
    public CourierProfileDto Shift(ShiftRequest r)
    {
        var p = Profile();
        p.IsAvailable = r.IsAvailable;
        _db.SaveChanges();
        return GetProfile();
    }

    [HttpGet("orders")] public IReadOnlyList<OrderDto> Orders([FromQuery] bool active = true) => _orders.ForCourier(Profile().Id, active);
    [HttpPost("orders/{id:long}/picked-up")] public OrderDto PickedUp(long id) => _orders.ChangeStatus(User.UserId(), Roles.Courier, id, OrderStatuses.OnTheWay, null);
    [HttpPost("orders/{id:long}/delivered")] public OrderDto Delivered(long id) => _orders.ChangeStatus(User.UserId(), Roles.Courier, id, OrderStatuses.Delivered, null);
}

// ======================================================================
// Панель суперадминистратора
// ======================================================================
[ApiController, Route("api/admin"), Authorize(Roles = Roles.SuperAdmin)]
public sealed class AdminController : ControllerBase
{
    private readonly AdminService _admin;
    private readonly StatsService _stats;

    public AdminController(AdminService admin, StatsService stats)
    {
        _admin = admin;
        _stats = stats;
    }

    [HttpGet("stats")] public PlatformStatsDto Stats() => _stats.Platform();
    [HttpGet("restaurants")] public IReadOnlyList<AdminRestaurantDto> Restaurants() => _admin.Restaurants();
    [HttpPost("restaurants")] public AdminRestaurantDto CreateRestaurant(CreateRestaurantRequest r) => _admin.CreateRestaurant(r);
    [HttpPost("restaurants/{id:long}/status")] public IActionResult RestaurantStatus(long id, RestaurantStatusRequest r) { _admin.SetRestaurantStatus(id, r.Status); return NoContent(); }
    [HttpGet("users")] public IReadOnlyList<UserDto> Users([FromQuery] string? role) => _admin.Users(role);
    [HttpPost("users/{id:long}/active")] public UserDto UserActive(long id, UserActiveRequest r) => _admin.SetUserActive(User.UserId(), id, r.IsActive);
    [HttpPost("couriers")] public UserDto CreateCourier(CreateCourierRequest r) => _admin.CreateCourier(r);
    [HttpGet("plans")] public IReadOnlyList<PlanDto> Plans() => _admin.Plans();
}
