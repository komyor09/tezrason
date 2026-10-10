using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using TezRason.Api.Domain;

namespace TezRason.Api.Auth;

/// <summary>
/// Выпуск и проверка JWT-токенов (алгоритм HS256, RFC 7519).
/// Реализован на стандартной криптографии .NET без сторонних библиотек.
/// </summary>
public sealed class JwtTokenService
{
    private readonly byte[] _key;
    private readonly TimeSpan _lifetime;
    private readonly string _issuer;

    public JwtTokenService(IConfiguration config)
    {
        var secret = config["Jwt:Secret"] ?? throw new InvalidOperationException("Не задан Jwt:Secret");
        if (secret.Length < 32) throw new InvalidOperationException("Jwt:Secret должен содержать не менее 32 символов");
        _key = Encoding.UTF8.GetBytes(secret);
        _lifetime = TimeSpan.FromHours(config.GetValue("Jwt:LifetimeHours", 12));
        _issuer = config["Jwt:Issuer"] ?? "TezRason";
    }

    public (string Token, DateTime ExpiresAt) Issue(User user)
    {
        var expires = DateTime.UtcNow.Add(_lifetime);
        var header = new { alg = "HS256", typ = "JWT" };
        var payload = new Dictionary<string, object>
        {
            ["sub"] = user.Id.ToString(),
            ["role"] = Roles.ById[user.RoleId],
            ["name"] = user.FullName,
            ["iss"] = _issuer,
            ["iat"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ["exp"] = new DateTimeOffset(expires).ToUnixTimeSeconds(),
        };
        var unsigned = $"{B64(JsonSerializer.SerializeToUtf8Bytes(header))}.{B64(JsonSerializer.SerializeToUtf8Bytes(payload))}";
        return ($"{unsigned}.{Sign(unsigned)}", expires);
    }

    /// <summary>Проверяет подпись и срок действия токена. Возвращает набор утверждений или null.</summary>
    public ClaimsPrincipal? Validate(string token, string scheme)
    {
        var parts = token.Split('.');
        if (parts.Length != 3) return null;

        var expected = Encoding.ASCII.GetBytes(Sign($"{parts[0]}.{parts[1]}"));
        if (!CryptographicOperations.FixedTimeEquals(expected, Encoding.ASCII.GetBytes(parts[2]))) return null;

        using var doc = JsonDocument.Parse(FromB64(parts[1]));
        var root = doc.RootElement;
        if (!root.TryGetProperty("exp", out var exp) || DateTimeOffset.FromUnixTimeSeconds(exp.GetInt64()) < DateTimeOffset.UtcNow)
            return null;
        if (root.GetProperty("iss").GetString() != _issuer) return null;

        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, root.GetProperty("sub").GetString()!),
            new Claim(ClaimTypes.Role, root.GetProperty("role").GetString()!),
            new Claim(ClaimTypes.Name, root.GetProperty("name").GetString()!),
        }, scheme);
        return new ClaimsPrincipal(identity);
    }

    private string Sign(string data)
    {
        using var hmac = new HMACSHA256(_key);
        return B64(hmac.ComputeHash(Encoding.ASCII.GetBytes(data)));
    }

    private static string B64(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromB64(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(s.PadRight(s.Length + (4 - s.Length % 4) % 4, '='));
    }
}
