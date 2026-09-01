using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace MosqueOS.API.Services;

public static class MosqueRateLimitPolicies
{
    public const string ClaimSubmit = "claim-submit";
    public const string RegistrationSubmit = "registration-submit";
    public const string AuthLogin = "auth-login";
    public const string AuthRegister = "auth-register";
    public const string AuthSensitive = "auth-sensitive";

    public static IServiceCollection AddMosqueRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (ctx, token) =>
            {
                ctx.HttpContext.Response.ContentType = "application/json";
                await ctx.HttpContext.Response.WriteAsync(
                    """{"message":"Rate limit exceeded. Try again later."}""",
                    token);
            };

            // 5 claims per hour per authenticated user (or IP for edge cases)
            options.AddPolicy(ClaimSubmit, httpContext =>
            {
                var userId = httpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? httpContext.Connection.RemoteIpAddress?.ToString()
                    ?? "anon";
                return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromHours(1),
                    QueueLimit = 0
                });
            });

            options.AddPolicy(RegistrationSubmit, httpContext =>
            {
                var userId = httpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? httpContext.Connection.RemoteIpAddress?.ToString()
                    ?? "anon";
                return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromHours(1),
                    QueueLimit = 0
                });
            });

            options.AddPolicy(AuthLogin, httpContext =>
            {
                var key = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon";
                return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 20,
                    Window = TimeSpan.FromMinutes(15),
                    QueueLimit = 0
                });
            });

            options.AddPolicy(AuthRegister, httpContext =>
            {
                var key = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon";
                return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromHours(1),
                    QueueLimit = 0
                });
            });

            options.AddPolicy(AuthSensitive, httpContext =>
            {
                var key = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anon";
                return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromMinutes(15),
                    QueueLimit = 0
                });
            });
        });

        return services;
    }
}
