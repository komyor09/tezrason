namespace TezRason.Api.Contracts;

// ---------- Аутентификация ----------
public record RegisterRequest(string FullName, string Phone, string Password, string? Email, string? Language);
public record LoginRequest(string Phone, string Password);
public record UserDto(long Id, string FullName, string Phone, string? Email, string Role, string Language, bool IsActive);
public record AuthResponse(string Token, DateTime ExpiresAt, UserDto User);
public record LanguageRequest(string Language);

// ---------- Каталог ----------
public record RestaurantDto(long Id, string Name, string? DescriptionRu, string? DescriptionTj, string? Cuisine, string Phone,
    string AddressLine, string? LogoUrl, decimal MinOrderAmount, decimal DeliveryFee, short AvgCookingMin, decimal Rating,
    string Status, bool IsOpenNow, string? WorkingHoursToday);
public record CategoryDto(long Id, string NameRu, string NameTj, short SortOrder);
public record DishDto(long Id, long CategoryId, string NameRu, string NameTj, string? DescriptionRu, string? DescriptionTj,
    decimal Price, int? WeightG, string? ImageUrl, bool IsAvailable);
public record PromotionDto(long Id, string TitleRu, string TitleTj, string DiscountType, decimal DiscountValue, DateTime StartsAt, DateTime EndsAt, bool IsActive);
public record MenuDto(RestaurantDto Restaurant, IReadOnlyList<CategoryDto> Categories, IReadOnlyList<DishDto> Dishes, IReadOnlyList<PromotionDto> Promotions);

// ---------- Заказы ----------
public record CartItemRequest(long DishId, int Quantity);
public record CreateOrderRequest(long RestaurantId, IReadOnlyList<CartItemRequest> Items, string DeliveryAddress, string ContactPhone,
    string? PaymentMethod, string? Comment);
public record OrderItemDto(long DishId, string DishName, decimal UnitPrice, short Quantity, decimal LineTotal);
public record StatusHistoryDto(string Status, DateTime ChangedAt, string? ChangedByName, string? Comment);
public record CourierInfoDto(long Id, string FullName, string Phone, string TransportType, decimal Rating);
public record OrderDto(long Id, string OrderNumber, string Status, long RestaurantId, string RestaurantName, string? RestaurantAddress,
    long ClientId, string ClientName, string DeliveryAddress, string ContactPhone, decimal Subtotal, decimal Discount,
    decimal DeliveryFee, decimal Total, string PaymentMethod, string? Comment, DateTime CreatedAt, DateTime? DeliveredAt,
    CourierInfoDto? Courier, IReadOnlyList<OrderItemDto> Items, IReadOnlyList<StatusHistoryDto> History,
    IReadOnlyList<string> NextStatuses, bool HasReview);
public record ChangeStatusRequest(string Status, string? Comment);
public record AssignCourierRequest(long CourierId);
public record ReviewRequest(short FoodRating, short DeliveryRating, string? Comment);

// ---------- Управление меню ----------
public record CategoryRequest(string NameRu, string NameTj, short SortOrder);
public record DishRequest(long CategoryId, string NameRu, string NameTj, string? DescriptionRu, string? DescriptionTj,
    decimal Price, int? WeightG, string? ImageUrl, bool IsAvailable);
public record PromotionRequest(string TitleRu, string TitleTj, string DiscountType, decimal DiscountValue, DateTime StartsAt, DateTime EndsAt, bool IsActive);
public record ScheduleDto(short DayOfWeek, string? OpenTime, string? CloseTime, bool IsDayOff);
public record RestaurantUpdateRequest(string Name, string? DescriptionRu, string? DescriptionTj, string? Cuisine, string Phone,
    string AddressLine, decimal MinOrderAmount, decimal DeliveryFee, short AvgCookingMin);

// ---------- Курьер ----------
public record ShiftRequest(bool IsAvailable);
public record CourierProfileDto(long Id, string FullName, string Phone, string TransportType, bool IsAvailable, decimal Rating,
    int DeliveredToday, decimal CashToday, int ActiveOrders);

// ---------- Статистика ----------
public record NamedValue(string Name, decimal Value);
public record RestaurantStatsDto(decimal RevenueToday, decimal RevenueWeek, decimal RevenueTotal, int OrdersTotal, int OrdersToday,
    int ActiveOrders, decimal AverageCheck, decimal Rating, IReadOnlyList<NamedValue> TopDishes, IReadOnlyList<NamedValue> RevenueByDay);
public record PlatformStatsDto(int ActiveRestaurants, int PendingRestaurants, int BlockedRestaurants, int OrdersToday, int OrdersTotal,
    decimal RevenueTotal, int Clients, int Couriers, int CouriersOnShift, IReadOnlyList<NamedValue> OrdersByStatus);

// ---------- Суперадминистратор ----------
public record AdminRestaurantDto(long Id, string Name, string? Cuisine, string Status, string OwnerName, string OwnerPhone,
    string? PlanName, int OrdersMonth, decimal Rating, DateTime CreatedAt);
public record RestaurantStatusRequest(string Status);
public record CreateRestaurantRequest(string Name, string? Cuisine, string Phone, string AddressLine, string OwnerFullName,
    string OwnerPhone, string OwnerPassword, int? PlanId);
public record CreateCourierRequest(string FullName, string Phone, string Password, string TransportType);
public record UserActiveRequest(bool IsActive);
public record PlanDto(int Id, string Name, decimal MonthlyPrice, int? MaxDishes, bool HasAnalytics);
