namespace TezRason.Api.Domain;

// Сущности предметной области. Имена таблиц и полей в БД — snake_case (см. database/schema.sql).
// Навигационные свойства намеренно не используются: связи задаются внешними ключами,
// что делает код одинаково работоспособным и с PostgreSQL, и с хранилищем в памяти.

public class Role
{
    public short Id { get; set; }
    public string Code { get; set; } = "";
    public string NameRu { get; set; } = "";
    public string NameTj { get; set; } = "";
}

public class User
{
    public long Id { get; set; }
    public short RoleId { get; set; }
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string? Email { get; set; }
    public string PasswordHash { get; set; } = "";
    public string Language { get; set; } = "ru";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Address
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string? Title { get; set; }
    public string AddressLine { get; set; } = "";
    public string? Apartment { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool IsDefault { get; set; }
}

public class CourierProfile
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public string TransportType { get; set; } = "scooter";
    public bool IsAvailable { get; set; }
    public decimal Rating { get; set; } = 5.00m;
}

public class SubscriptionPlan
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal MonthlyPrice { get; set; }
    public int? MaxDishes { get; set; }
    public bool HasAnalytics { get; set; }
}

public class Restaurant
{
    public long Id { get; set; }
    public long OwnerId { get; set; }
    public string Name { get; set; } = "";
    public string? DescriptionRu { get; set; }
    public string? DescriptionTj { get; set; }
    public string? Cuisine { get; set; }
    public string Phone { get; set; } = "";
    public string AddressLine { get; set; } = "";
    public string? LogoUrl { get; set; }
    public decimal MinOrderAmount { get; set; }
    public decimal DeliveryFee { get; set; }
    public short AvgCookingMin { get; set; } = 30;
    public decimal Rating { get; set; }
    public string Status { get; set; } = RestaurantStatuses.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class RestaurantSubscription
{
    public long Id { get; set; }
    public long RestaurantId { get; set; }
    public int PlanId { get; set; }
    public DateOnly StartsAt { get; set; }
    public DateOnly EndsAt { get; set; }
    public string Status { get; set; } = "active";
}

public class RestaurantSchedule
{
    public long Id { get; set; }
    public long RestaurantId { get; set; }
    public short DayOfWeek { get; set; }          // 1 — понедельник … 7 — воскресенье
    public TimeOnly? OpenTime { get; set; }
    public TimeOnly? CloseTime { get; set; }
    public bool IsDayOff { get; set; }
}

public class Category
{
    public long Id { get; set; }
    public long RestaurantId { get; set; }
    public string NameRu { get; set; } = "";
    public string NameTj { get; set; } = "";
    public short SortOrder { get; set; }
}

public class Dish
{
    public long Id { get; set; }
    public long RestaurantId { get; set; }
    public long CategoryId { get; set; }
    public string NameRu { get; set; } = "";
    public string NameTj { get; set; } = "";
    public string? DescriptionRu { get; set; }
    public string? DescriptionTj { get; set; }
    public decimal Price { get; set; }
    public int? WeightG { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsAvailable { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Promotion
{
    public long Id { get; set; }
    public long RestaurantId { get; set; }
    public string TitleRu { get; set; } = "";
    public string TitleTj { get; set; } = "";
    public string DiscountType { get; set; } = "percent";   // percent | fixed
    public decimal DiscountValue { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Order
{
    public long Id { get; set; }
    public string OrderNumber { get; set; } = "";
    public long ClientId { get; set; }
    public long RestaurantId { get; set; }
    public long? CourierId { get; set; }
    public long? PromotionId { get; set; }
    public string DeliveryAddress { get; set; } = "";
    public string ContactPhone { get; set; } = "";
    public string Status { get; set; } = OrderStatuses.New;
    public decimal Subtotal { get; set; }
    public decimal Discount { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = "cash";
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeliveredAt { get; set; }
}

public class OrderItem
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public long DishId { get; set; }
    public string DishName { get; set; } = "";
    public decimal UnitPrice { get; set; }
    public short Quantity { get; set; }
    public decimal LineTotal { get; set; }
}

public class OrderStatusHistory
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public string Status { get; set; } = "";
    public long? ChangedBy { get; set; }
    public string? Comment { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}

public class Review
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public long ClientId { get; set; }
    public long RestaurantId { get; set; }
    public short FoodRating { get; set; }
    public short DeliveryRating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
