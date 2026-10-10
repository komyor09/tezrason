using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TezRason.Api.Domain;

namespace TezRason.Api.Data;

/// <summary>
/// Контекст Entity Framework Core для PostgreSQL (Database:Provider = "Postgres").
/// Структура совпадает со скриптом database/schema.sql.
/// </summary>
public sealed class AppDbContext : DbContext, IAppDataContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    IQueryable<Role> IAppDataContext.Roles => Set<Role>();
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

    void IAppDataContext.Add<T>(T entity) => Set<T>().Add(entity);
    void IAppDataContext.Remove<T>(T entity) => Set<T>().Remove(entity);
    void IAppDataContext.SaveChanges() => base.SaveChanges();
    bool IAppDataContext.IsEmpty() => !Set<Role>().Any();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Role>(e => { e.ToTable("roles"); e.Property(x => x.Id).ValueGeneratedNever(); e.HasIndex(x => x.Code).IsUnique(); });
        b.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasIndex(x => x.Phone).IsUnique();
            e.HasIndex(x => x.Email).IsUnique();
            e.HasOne<Role>().WithMany().HasForeignKey(x => x.RoleId);
        });
        b.Entity<Address>(e => { e.ToTable("addresses"); e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade); });
        b.Entity<CourierProfile>(e => { e.ToTable("courier_profiles"); e.HasIndex(x => x.UserId).IsUnique(); e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId); });
        b.Entity<SubscriptionPlan>(e => { e.ToTable("subscription_plans"); e.HasIndex(x => x.Name).IsUnique(); });
        b.Entity<Restaurant>(e => { e.ToTable("restaurants"); e.HasOne<User>().WithMany().HasForeignKey(x => x.OwnerId); });
        b.Entity<RestaurantSubscription>(e =>
        {
            e.ToTable("restaurant_subscriptions");
            e.HasOne<Restaurant>().WithMany().HasForeignKey(x => x.RestaurantId);
            e.HasOne<SubscriptionPlan>().WithMany().HasForeignKey(x => x.PlanId);
        });
        b.Entity<RestaurantSchedule>(e =>
        {
            e.ToTable("restaurant_schedules");
            e.HasIndex(x => new { x.RestaurantId, x.DayOfWeek }).IsUnique();
            e.HasOne<Restaurant>().WithMany().HasForeignKey(x => x.RestaurantId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<Category>(e => { e.ToTable("categories"); e.HasOne<Restaurant>().WithMany().HasForeignKey(x => x.RestaurantId).OnDelete(DeleteBehavior.Cascade); });
        b.Entity<Dish>(e =>
        {
            e.ToTable("dishes");
            e.HasIndex(x => new { x.RestaurantId, x.CategoryId });
            e.HasOne<Restaurant>().WithMany().HasForeignKey(x => x.RestaurantId);
            e.HasOne<Category>().WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<Promotion>(e => { e.ToTable("promotions"); e.HasOne<Restaurant>().WithMany().HasForeignKey(x => x.RestaurantId); });
        b.Entity<Order>(e =>
        {
            e.ToTable("orders", t => t.HasCheckConstraint("ck_orders_status",
                "status IN ('new','accepted','cooking','ready','on_the_way','delivered','cancelled')"));
            e.HasIndex(x => x.OrderNumber).IsUnique();
            e.HasIndex(x => new { x.ClientId, x.CreatedAt });
            e.HasIndex(x => new { x.RestaurantId, x.Status });
            e.HasIndex(x => new { x.CourierId, x.Status });
            e.HasOne<User>().WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Restaurant>().WithMany().HasForeignKey(x => x.RestaurantId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<CourierProfile>().WithMany().HasForeignKey(x => x.CourierId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Promotion>().WithMany().HasForeignKey(x => x.PromotionId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<OrderItem>(e =>
        {
            e.ToTable("order_items");
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<Dish>().WithMany().HasForeignKey(x => x.DishId).OnDelete(DeleteBehavior.Restrict);
        });
        b.Entity<OrderStatusHistory>(e =>
        {
            e.ToTable("order_status_history");
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<Review>(e =>
        {
            e.ToTable("reviews", t =>
            {
                t.HasCheckConstraint("ck_reviews_food", "food_rating BETWEEN 1 AND 5");
                t.HasCheckConstraint("ck_reviews_delivery", "delivery_rating BETWEEN 1 AND 5");
            });
            e.HasIndex(x => x.OrderId).IsUnique();
            e.HasOne<Order>().WithMany().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Restrict);
        });

        // Единые соглашения: snake_case для столбцов, NUMERIC(10,2) для денег, NUMERIC(3,2) для рейтингов
        foreach (var entity in b.Model.GetEntityTypes())
        {
            foreach (var p in entity.GetProperties())
            {
                p.SetColumnName(ToSnake(p.Name));
                if (p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?))
                {
                    if (p.Name == "Rating") { p.SetPrecision(3); p.SetScale(2); }
                    else if (p.Name is "Latitude" or "Longitude") { p.SetPrecision(9); p.SetScale(6); }
                    else { p.SetPrecision(10); p.SetScale(2); }
                }
            }
        }
    }

    private static string ToSnake(string name) => Regex.Replace(name, "(?<=[a-z0-9])([A-Z])", "_$1").ToLowerInvariant();
}
