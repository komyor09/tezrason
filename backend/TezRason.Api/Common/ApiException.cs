namespace TezRason.Api.Common;

/// <summary>Ошибка бизнес-логики, которая возвращается клиенту с указанным HTTP-кодом.</summary>
public sealed class ApiException : Exception
{
    public int StatusCode { get; }
    public ApiException(int statusCode, string message) : base(message) => StatusCode = statusCode;

    public static ApiException BadRequest(string m) => new(400, m);
    public static ApiException Forbidden(string m) => new(403, m);
    public static ApiException NotFound(string m) => new(404, m);
    public static ApiException Conflict(string m) => new(409, m);
}

/// <summary>Преобразует исключения в единый JSON-ответ { "error": "..." }.</summary>
public sealed class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _log;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> log)
    {
        _next = next;
        _log = log;
    }

    public async Task Invoke(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (ApiException ex)
        {
            ctx.Response.StatusCode = ex.StatusCode;
            await ctx.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Необработанная ошибка");
            ctx.Response.StatusCode = 500;
            await ctx.Response.WriteAsJsonAsync(new { error = "Внутренняя ошибка сервера" });
        }
    }
}
