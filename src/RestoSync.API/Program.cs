using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RestoSync.API.Hubs;
using RestoSync.API.Middleware;
using RestoSync.API.Services;
using RestoSync.Application.Interfaces;
using RestoSync.Application.Validators;
using RestoSync.Domain.Common;
using RestoSync.Domain.Entities;
using RestoSync.Infrastructure.Data;
using RestoSync.Infrastructure.Repositories;
using RestoSync.Infrastructure.Security;
using RestoSync.Infrastructure.Services;

// Load .env configuration if present (from current directory or parent solution directories)
DotEnvLoader.Load();

var builder = WebApplication.CreateBuilder(args);

// 1. Add Services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

// 2. Swagger / OpenAPI Configuration with Bearer Auth
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "RestoSync Restaurant SaaS API",
        Version = "v1",
        Description = "RestoSync: A Multi-Tenant Real-Time Distributed Restaurant Operating and Point-of-Sale System API"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your valid JWT access token. Example: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// 3. Database & Core Infrastructure DI
builder.Services.AddSingleton<IMongoDbContext, MongoDbContext>();
builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddSingleton<IJwtService, JwtService>();
builder.Services.AddSingleton<IPinRateLimiter, PinRateLimiter>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IRazorpayService, RazorpayService>();

// Register generic repositories
builder.Services.AddScoped<IRepository<Category>>(sp => 
    new MongoRepository<Category>(sp.GetRequiredService<IMongoDbContext>(), "categories"));
builder.Services.AddScoped<IRepository<MenuItem>>(sp => 
    new MongoRepository<MenuItem>(sp.GetRequiredService<IMongoDbContext>(), "menuItems"));
builder.Services.AddScoped<IRepository<Order>>(sp => 
    new MongoRepository<Order>(sp.GetRequiredService<IMongoDbContext>(), "orders"));
builder.Services.AddScoped<IRepository<Customer>>(sp => 
    new MongoRepository<Customer>(sp.GetRequiredService<IMongoDbContext>(), "customers"));
builder.Services.AddScoped<IRepository<RestaurantTable>>(sp => 
    new MongoRepository<RestaurantTable>(sp.GetRequiredService<IMongoDbContext>(), "tables"));
builder.Services.AddScoped<IRepository<InventoryItem>>(sp => 
    new MongoRepository<InventoryItem>(sp.GetRequiredService<IMongoDbContext>(), "inventory"));
builder.Services.AddScoped<IRepository<Expense>>(sp => 
    new MongoRepository<Expense>(sp.GetRequiredService<IMongoDbContext>(), "expenses"));
builder.Services.AddScoped<IRepository<CashFlowEntry>>(sp => 
    new MongoRepository<CashFlowEntry>(sp.GetRequiredService<IMongoDbContext>(), "cashFlowEntries"));
builder.Services.AddScoped<IRepository<Discount>>(sp => 
    new MongoRepository<Discount>(sp.GetRequiredService<IMongoDbContext>(), "discounts"));
builder.Services.AddScoped<IRepository<Feedback>>(sp => 
    new MongoRepository<Feedback>(sp.GetRequiredService<IMongoDbContext>(), "feedbacks"));

// 4. FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();

// 5. SignalR
builder.Services.AddSignalR();

// 6. Authentication & JWT Bearer
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT signing key (Jwt:Key) must be configured.");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "RestoSyncAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "RestoSyncClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
        ClockSkew = TimeSpan.Zero
    };

    // Support token for SignalR Hub WebSockets
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// 7. CORS — read allowed origins from configuration, always allow localhost
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:5173", "http://localhost:3000" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("RestoSyncCors", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;
            if (allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)) return true;
            if (Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || uri.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)))
                return true;
            return false;
        })
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

var app = builder.Build();

// 8. Seed Database on Startup (gated in production — requires FORCE_SEED=true)
var shouldSeed = app.Environment.IsDevelopment() ||
    string.Equals(builder.Configuration["FORCE_SEED"], "true", StringComparison.OrdinalIgnoreCase);

if (shouldSeed)
{
    using var scope = app.Services.CreateScope();
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<IMongoDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        await DbSeeder.SeedDatabaseAsync(dbContext, hasher);
        Console.WriteLine("--> [RestoSync] MongoDB Connected & Seeded Successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"--> [RestoSync] Error during DB Seeding: {ex.Message}");
    }
}
else
{
    Console.WriteLine("--> [RestoSync] Skipping DB seed in production. Set FORCE_SEED=true to seed.");
}

// 9. HTTP Pipeline Middleware — UseCors MUST precede error middleware to attach CORS headers to all responses
app.UseCors("RestoSyncCors");
app.UseMiddleware<GlobalExceptionMiddleware>();

var swaggerEnabled = app.Environment.IsDevelopment() ||
    string.Equals(builder.Configuration["Swagger:Enabled"], "true", StringComparison.OrdinalIgnoreCase);

if (swaggerEnabled)
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "RestoSync API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<OrderHub>("/hubs/order");

app.Run();

// Make Program accessible to integration tests via WebApplicationFactory<Program>
public partial class Program { }

public static class DotEnvLoader
{
    public static void Load()
    {
        try
        {
            var searchDir = new DirectoryInfo(Directory.GetCurrentDirectory());
            FileInfo? envFile = null;

            for (int i = 0; i < 5 && searchDir != null; i++)
            {
                var candidate = Path.Combine(searchDir.FullName, ".env");
                if (File.Exists(candidate))
                {
                    envFile = new FileInfo(candidate);
                    break;
                }
                searchDir = searchDir.Parent;
            }

            if (envFile == null || !envFile.Exists) return;

            foreach (var rawLine in File.ReadAllLines(envFile.FullName))
            {
                var line = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#')) continue;

                var idx = line.IndexOf('=');
                if (idx <= 0) continue;

                var key = line.Substring(0, idx).Trim();
                var val = line.Substring(idx + 1).Trim();

                if ((val.StartsWith('"') && val.EndsWith('"')) || (val.StartsWith('\'') && val.EndsWith('\'')))
                {
                    val = val.Substring(1, val.Length - 2);
                }

                if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                {
                    Environment.SetEnvironmentVariable(key, val);
                }

                // Map standard configuration aliases for ASP.NET Core
                if (key == "MONGODB_CONNECTION_STRING")
                {
                    Environment.SetEnvironmentVariable("ConnectionStrings__MongoDb", val);
                    Environment.SetEnvironmentVariable("MongoDB__ConnectionString", val);
                }
                else if (key == "MONGODB_DATABASE_NAME")
                {
                    Environment.SetEnvironmentVariable("MongoDB__DatabaseName", val);
                }
                else if (key == "JWT_KEY")
                {
                    Environment.SetEnvironmentVariable("Jwt__Key", val);
                }
                else if (key == "JWT_ISSUER")
                {
                    Environment.SetEnvironmentVariable("Jwt__Issuer", val);
                }
                else if (key == "JWT_AUDIENCE")
                {
                    Environment.SetEnvironmentVariable("Jwt__Audience", val);
                }
                else if (key == "SWAGGER_ENABLED")
                {
                    Environment.SetEnvironmentVariable("Swagger__Enabled", val);
                }
                else if (key == "SMTP_HOST")
                {
                    Environment.SetEnvironmentVariable("Smtp__Host", val);
                }
                else if (key == "SMTP_PORT")
                {
                    Environment.SetEnvironmentVariable("Smtp__Port", val);
                }
                else if (key == "SMTP_USER")
                {
                    Environment.SetEnvironmentVariable("Smtp__User", val);
                }
                else if (key == "SMTP_FROM_EMAIL")
                {
                    Environment.SetEnvironmentVariable("Smtp__FromEmail", val);
                }
                else if (key == "RAZORPAY_KEY_ID")
                {
                    Environment.SetEnvironmentVariable("Razorpay__KeyId", val);
                }
                else if (key == "RAZORPAY_KEY_SECRET")
                {
                    Environment.SetEnvironmentVariable("Razorpay__KeySecret", val);
                }
                else if (key == "CRM_API_URL")
                {
                    Environment.SetEnvironmentVariable("CRM__ApiUrl", val);
                }
                else if (key == "CRM_API_KEY")
                {
                    Environment.SetEnvironmentVariable("CRM__ApiKey", val);
                }
            }
        }
        catch
        {
            // Silently fallback if .env cannot be read
        }
    }
}
