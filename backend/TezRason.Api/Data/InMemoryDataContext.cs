using System.Collections.Concurrent;
using System.Reflection;
using TezRason.Api.Domain;

namespace TezRason.Api.Data;

/// <summary>
/// Демонстрационное хранилище в оперативной памяти (Database:Provider = "InMemory").
/// Позволяет запустить платформу без установленного PostgreSQL. Данные теряются при перезапуске.
/// </summary>
public sealed class InMemoryDataContext : IAppDataContext
{
    private readonly ConcurrentDictionary<Type, List<object>> _sets = new();
    private readonly ConcurrentDictionary<Type, long> _ids = new();
    private readonly object _lock = new();

    private IQueryable<T> Set<T>() where T : class
    {
        lock (_lock)
        {
            var list = _sets.GetOrAdd(typeof(T), _ => new List<object>());
            return list.Cast<T>().ToList().AsQueryable();   // снимок для безопасного чтения
        }
    }

    public IQueryable<Role> Roles => Set<Role>();
    public IQueryable<User> Users => Set<User>();
    public IQueryable<Address> Addresses => Set<Address>();
    public IQueryable<CourierProfile> CourierProfiles => Set<CourierProfile>();
    public IQueryable<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public IQueryable<Restaurant> Restaurants => Set<Restaurant>();
    public IQueryable<RestaurantSubscription> RestaurantSubscriptions => Set<RestaurantSubscription>();
    public IQueryable<RestaurantSchedule> RestaurantSchedules => Set<RestaurantSchedule>();
    public IQueryable<Category> Categories => Set<Category>();
    public IQueryable<Dish> Dishes => Set<Dish>();
    public IQueryable<Promotion> Promotions => Set<Promotion>();
    public IQueryable<Order> Orders => Set<Order>();
    public IQueryable<OrderItem> OrderItems => Set<OrderItem>();
    public IQueryable<OrderStatusHistory> OrderStatusHistory => Set<OrderStatusHistory>();
    public IQueryable<Review> Reviews => Set<Review>();

    public void Add<T>(T entity) where T : class
    {
        lock (_lock)
        {
            var idProp = typeof(T).GetProperty("Id", BindingFlags.Public | BindingFlags.Instance)!;
            var current = Convert.ToInt64(idProp.GetValue(entity));
            var next = _ids.AddOrUpdate(typeof(T), _ => Math.Max(current, 1), (_, last) => current > 0 ? Math.Max(last, current) : last + 1);
            if (current == 0) idProp.SetValue(entity, Convert.ChangeType(next, idProp.PropertyType));
            _sets.GetOrAdd(typeof(T), _ => new List<object>()).Add(entity);
        }
    }

    public void Remove<T>(T entity) where T : class
    {
        lock (_lock) { if (_sets.TryGetValue(typeof(T), out var list)) list.Remove(entity); }
    }

    public void SaveChanges() { /* объекты изменяются по ссылке — сохранять нечего */ }

    public bool IsEmpty() => !Roles.Any();
}
