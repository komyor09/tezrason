using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using TezRason.Api.Auth;
using TezRason.Api.Common;
using TezRason.Api.Contracts;
using TezRason.Api.Data;
using TezRason.Api.Domain;

namespace TezRason.Api.Services;

/// <summary>Регистрация, вход и управление профилем пользователя.</summary>
public sealed class AuthService
{
    private static readonly Regex PhoneRx = new(@"^\+992\d{9}$");
    private readonly IAppDataContext _db;
    private readonly JwtTokenService _tokens;
    private readonly PasswordHasher<User> _hasher = new();

    public AuthService(IAppDataContext db, JwtTokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    public static string NormalizePhone(string phone) => Regex.Replace(phone ?? "", @"[\s\-()]", "");

    public string HashPassword(string password) => _hasher.HashPassword(new User(), password);

    public AuthResponse Register(RegisterRequest r)
    {
        var phone = NormalizePhone(r.Phone);
        if (string.IsNullOrWhiteSpace(r.FullName) || r.FullName.Trim().Length < 2)
            throw ApiException.BadRequest("Укажите имя (не менее 2 символов)");
        if (!PhoneRx.IsMatch(phone))
            throw ApiException.BadRequest("Телефон должен быть в формате +992XXXXXXXXX");
        if (string.IsNullOrEmpty(r.Password) || r.Password.Length < 6)
            throw ApiException.BadRequest("Пароль должен содержать не менее 6 символов");
        if (_db.Users.Any(u => u.Phone == phone))
            throw ApiException.Conflict("Пользователь с таким телефоном уже зарегистрирован");

        var user = new User
        {
            RoleId = Roles.IdOf(Roles.Client),
            FullName = r.FullName.Trim(),
            Phone = phone,
            Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim(),
            Language = r.Language == "tj" ? "tj" : "ru",
            PasswordHash = HashPassword(r.Password),
        };
        _db.Add(user);
        _db.SaveChanges();
        return Issue(user);
    }

    public AuthResponse Login(LoginRequest r)
    {
        var phone = NormalizePhone(r.Phone);
        var user = _db.Users.FirstOrDefault(u => u.Phone == phone);
        if (user is null || _hasher.VerifyHashedPassword(user, user.PasswordHash, r.Password ?? "") == PasswordVerificationResult.Failed)
            throw new ApiException(401, "Неверный телефон или пароль");
        if (!user.IsActive)
            throw ApiException.Forbidden("Учётная запись заблокирована администратором");
        return Issue(user);
    }

    public UserDto Me(long userId) => ToDto(_db.Users.First(u => u.Id == userId));

    public UserDto SetLanguage(long userId, string language)
    {
        if (language is not ("ru" or "tj")) throw ApiException.BadRequest("Допустимые языки: ru, tj");
        var user = _db.Users.First(u => u.Id == userId);
        user.Language = language;
        user.UpdatedAt = DateTime.UtcNow;
        _db.SaveChanges();
        return ToDto(user);
    }

    private AuthResponse Issue(User user)
    {
        var (token, expires) = _tokens.Issue(user);
        return new AuthResponse(token, expires, ToDto(user));
    }

    public static UserDto ToDto(User u) => new(u.Id, u.FullName, u.Phone, u.Email, Roles.ById[u.RoleId], u.Language, u.IsActive);
}
