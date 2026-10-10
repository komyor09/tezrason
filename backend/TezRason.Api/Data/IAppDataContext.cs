using TezRason.Api.Domain;

namespace TezRason.Api.Data;

/// <summary>
/// Абстракция слоя доступа к данным. Сервисы работают только с этим интерфейсом,
/// поэтому реализация хранилища (PostgreSQL через EF Core или память) подменяется в Program.cs.
/// </summary>
public interface IAppDataContext
{
    IQueryable<Role> Roles { get; }
    IQueryable<User> Users { get; }
    IQueryable<Address> Addresses { get; }
    IQueryable<CourierProfile> CourierProfiles { get; }
    IQueryable<SubscriptionPlan> SubscriptionPlans { get; }
    IQueryable<Restaurant> Restaurants { get; }
    IQueryable<RestaurantSubscription> RestaurantSubscriptions { get; }
    IQueryable<RestaurantSchedule> RestaurantSchedules { get; }
    IQueryable<Category> Categories { get; }
    IQueryable<Dish> Dishes { get; }
    IQueryable<Promotion> Promotions { get; }
    IQueryable<Order> Orders { get; }
    IQueryable<OrderItem> OrderItems { get; }
    IQueryable<OrderStatusHistory> OrderStatusHistory { get; }
    IQueryable<Review> Reviews { get; }

    void Add<T>(T entity) where T : class;
    void Remove<T>(T entity) where T : class;
    /// <summary>Сохраняет изменения. После вызова у новых сущностей заполнены идентификаторы.</summary>
    void SaveChanges();
    bool IsEmpty();
}
