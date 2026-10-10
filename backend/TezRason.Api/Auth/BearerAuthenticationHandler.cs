using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using TezRason.Api.Data;

namespace TezRason.Api.Auth;

/// <summary>
/// Обработчик схемы «Bearer»: извлекает токен из заголовка Authorization,
/// проверяет его и дополнительно убеждается, что учётная запись не заблокирована.
/// </summary>
public sealed class BearerAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "Bearer";
    private readonly JwtTokenService _tokens;
    private readonly IAppDataContext _db;

    public BearerAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger,
        UrlEncoder encoder, JwtTokenService tokens, IAppDataContext db) : base(options, logger, encoder)
    {
        _tokens = tokens;
        _db = db;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var header = Request.Headers.Authorization.ToString();
        if (string.IsNullOrEmpty(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return Task.FromResult(AuthenticateResult.NoResult());

        var principal = _tokens.Validate(header["Bearer ".Length..].Trim(), SchemeName);
        if (principal is null) return Task.FromResult(AuthenticateResult.Fail("Недействительный токен"));

        var id = long.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = _db.Users.FirstOrDefault(u => u.Id == id);
        if (user is null || !user.IsActive) return Task.FromResult(AuthenticateResult.Fail("Учётная запись заблокирована"));

        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
    }
}

public static class ClaimsPrincipalExtensions
{
    public static long UserId(this ClaimsPrincipal user) => long.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public static string RoleCode(this ClaimsPrincipal user) => user.FindFirstValue(ClaimTypes.Role)!;
}
