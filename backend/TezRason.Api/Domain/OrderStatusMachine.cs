namespace TezRason.Api.Domain;

/// <summary>
/// Конечный автомат жизненного цикла заказа.
/// Определяет допустимые переходы между статусами и роль, которая может выполнить переход.
/// </summary>
public static class OrderStatusMachine
{
    public sealed record Transition(string From, string To, string Role);

    public static readonly IReadOnlyList<Transition> Transitions = new[]
    {
        new Transition(OrderStatuses.New,      OrderStatuses.Accepted,  Roles.RestaurantAdmin),
        new Transition(OrderStatuses.Accepted, OrderStatuses.Cooking,   Roles.RestaurantAdmin),
        new Transition(OrderStatuses.Cooking,  OrderStatuses.Ready,     Roles.RestaurantAdmin),
        new Transition(OrderStatuses.Ready,    OrderStatuses.OnTheWay,  Roles.Courier),
        new Transition(OrderStatuses.OnTheWay, OrderStatuses.Delivered, Roles.Courier),

        // Отмена возможна только до передачи заказа курьеру
        new Transition(OrderStatuses.New,      OrderStatuses.Cancelled, Roles.Client),
        new Transition(OrderStatuses.New,      OrderStatuses.Cancelled, Roles.RestaurantAdmin),
        new Transition(OrderStatuses.Accepted, OrderStatuses.Cancelled, Roles.RestaurantAdmin),
        new Transition(OrderStatuses.Cooking,  OrderStatuses.Cancelled, Roles.RestaurantAdmin),
        new Transition(OrderStatuses.Ready,    OrderStatuses.Cancelled, Roles.RestaurantAdmin),
    };

    public static bool CanTransition(string from, string to, string role) =>
        Transitions.Any(t => t.From == from && t.To == to && t.Role == role);

    /// <summary>Следующие статусы, доступные роли из текущего статуса.</summary>
    public static IEnumerable<string> NextFor(string from, string role) =>
        Transitions.Where(t => t.From == from && t.Role == role).Select(t => t.To);
}
