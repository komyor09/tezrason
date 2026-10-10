namespace TezRason.Api.Domain;

public static class Roles
{
    public const string Client = "client";
    public const string Courier = "courier";
    public const string RestaurantAdmin = "restaurant_admin";
    public const string SuperAdmin = "super_admin";

    public static readonly IReadOnlyDictionary<short, string> ById = new Dictionary<short, string>
    {
        [1] = Client, [2] = Courier, [3] = RestaurantAdmin, [4] = SuperAdmin,
    };

    public static short IdOf(string code) => ById.First(x => x.Value == code).Key;
}

public static class RestaurantStatuses
{
    public const string Pending = "pending";
    public const string Active = "active";
    public const string Blocked = "blocked";
    public static readonly string[] All = { Pending, Active, Blocked };
}

public static class OrderStatuses
{
    public const string New = "new";
    public const string Accepted = "accepted";
    public const string Cooking = "cooking";
    public const string Ready = "ready";
    public const string OnTheWay = "on_the_way";
    public const string Delivered = "delivered";
    public const string Cancelled = "cancelled";

    /// <summary>Статусы, при которых заказ считается активным (не завершён).</summary>
    public static readonly string[] Active = { New, Accepted, Cooking, Ready, OnTheWay };
}
