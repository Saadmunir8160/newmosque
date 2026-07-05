using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MosqueOS.Application;
using MosqueOS.API.Services;
using MosqueOS.Infrastructure;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// Clean Architecture layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<MosqueAccessService>();
builder.Services.AddScoped<SlugService>();
builder.Services.AddScoped<MosqueModuleSeedService>();
builder.Services.AddScoped<OwnershipClaimService>();
builder.Services.AddScoped<MosqueInvitationService>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<EmailOtpService>();
builder.Services.AddScoped<EmailVerificationService>();
builder.Services.Configure<MosqueOS.API.Services.EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddSingleton<MosqueOS.API.Services.IEmailSender, MosqueOS.API.Services.MosqueEmailSender>();

var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
var facebookAppId = builder.Configuration["Authentication:Facebook:AppId"];
var facebookAppSecret = builder.Configuration["Authentication:Facebook:AppSecret"];

var authBuilder = builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = true;
    options.RequireHttpsMetadata = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidAudience = builder.Configuration["JWT:ValidAudience"],
        ValidIssuer = builder.Configuration["JWT:ValidIssuer"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["JWT:Secret"] ?? "SuperSecretKeyForDevelopmentOnlyPleaseChange123"))
    };
});

if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authBuilder.AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.SignInScheme = Microsoft.AspNetCore.Identity.IdentityConstants.ExternalScheme;
    });
}

if (!string.IsNullOrWhiteSpace(facebookAppId) && !string.IsNullOrWhiteSpace(facebookAppSecret))
{
    authBuilder.AddFacebook(FacebookDefaults.AuthenticationScheme, options =>
    {
        options.AppId = facebookAppId;
        options.AppSecret = facebookAppSecret;
        options.SignInScheme = Microsoft.AspNetCore.Identity.IdentityConstants.ExternalScheme;
    });
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MosqueOS API",
        Version = "v1",
        Description = "MosqueOS REST API — Clean Architecture, Repository Pattern, EF Core Code First."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT token from POST /api/v1/auth/login"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var userManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<MosqueOS.Domain.Entities.ApplicationUser>>();
    var roleManager = scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.RoleManager<Microsoft.AspNetCore.Identity.IdentityRole>>();

    const int maxAttempts = 5;
    for (var attempt = 1; attempt <= maxAttempts; attempt++)
    {
        try
        {
            await DataSeeder.SeedAsync(db, userManager, roleManager);

            var moduleSeed = scope.ServiceProvider.GetRequiredService<MosqueModuleSeedService>();
            var mosqueIds = await db.Mosques.Where(m => !m.IsDeleted).Select(m => m.Id).ToListAsync();
            foreach (var mosqueId in mosqueIds)
                await moduleSeed.SeedAsync(mosqueId);

            if (attempt > 1)
                logger.LogInformation("Database seed completed on attempt {Attempt}.", attempt);
            break;
        }
        catch (SqlException ex) when (attempt < maxAttempts && IsTransientSql(ex))
        {
            var delay = TimeSpan.FromSeconds(5 * attempt);
            logger.LogWarning(ex,
                "SQL Express not ready (attempt {Attempt}/{Max}). Retrying in {DelaySeconds}s…",
                attempt, maxAttempts, delay.TotalSeconds);
            await Task.Delay(delay);
        }
    }
}

static bool IsTransientSql(SqlException ex) =>
    ex.Number is -2 or 53 or 4060 or 10054 or 10060 or 40197 or 40501 or 49918 or 49919 or 49920;

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "MosqueOS API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseCors("Frontend");

var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(webRoot);
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "audio"));
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "images"));
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "videos"));
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "mosques"));
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/", () => Results.Ok(new
{
    name = "MosqueOS API",
    version = "v1",
    architecture = "Clean Architecture · Repository Pattern · EF Core Code First",
    status = "running",
    message = "REST API — use Swagger UI for interactive docs.",
    endpoints = new
    {
        swagger = "/swagger",
        today = "/api/v1/today?mosqueId=1",
        mosques = "/api/v1/mosques",
        login = "POST /api/v1/auth/login"
    },
    frontend = "Angular app: cd frontend && ng serve → http://localhost:4200"
}));

app.Run();
