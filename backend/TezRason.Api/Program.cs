using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using TezRason.Api.Auth;
using TezRason.Api.Common;
using TezRason.Api.Data;
using TezRason.Api.Services;
#if FULL_BUILD
using Microsoft.EntityFrameworkCore;
#endif

var builder = WebApplication.CreateBuilder(args);
var provider = builder.Configuration["Database:Provider"] ?? "InMemory";

// ---------- Слой данных ----------
#if FULL_BUILD
if (provider.Equals("Postgres", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));
    builder.Services.AddScoped<IAppDataContext>(sp => sp.GetRequiredService<AppDbContext>());
}
else
#endif
{
    provider = "InMemory";
    builder.Services.AddSingleton<IAppDataContext, InMemoryDataContext>();
}

// ---------- Сервисы бизнес-логики ----------
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<CatalogService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<MenuManagementService>();
builder.Services.AddScoped<StatsService>();
builder.Services.AddScoped<AdminService>();

// ---------- Аутентификация и авторизация ----------
builder.Services.AddAuthentication(BearerAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, BearerAuthenticationHandler>(BearerAuthenticationHandler.SchemeName, null);
builder.Services.AddAuthorization();

builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? new[] { "http://localhost:4200" })
    .AllowAnyHeader().AllowAnyMethod()));
#if FULL_BUILD
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
#endif

var app = builder.Build();

// ---------- Создание схемы и демо-данные ----------
using (var scope = app.Services.CreateScope())
{
#if FULL_BUILD
    if (provider == "Postgres") scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreated();
#endif
    var db = scope.ServiceProvider.GetRequiredService<IAppDataContext>();
    if (app.Configuration.GetValue("Database:Seed", true))
        DataSeeder.Seed(db, scope.ServiceProvider.GetRequiredService<AuthService>());
}

app.UseMiddleware<ErrorHandlingMiddleware>();
#if FULL_BUILD
app.UseSwagger();
app.UseSwaggerUI();
#endif
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", database = provider, time = DateTime.UtcNow }));

// Раздача собранного Angular-приложения (если папка wwwroot присутствует)
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Logger.LogInformation("TezRason API запущен. Хранилище: {Provider}", provider);
app.Run();
