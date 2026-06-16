using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MosqueOS.Application;
using MosqueOS.Application.Common.Interfaces;
using MosqueOS.Domain.Entities;
using MosqueOS.Infrastructure.Repositories;
using MosqueOS.Infrastructure.Services;

namespace MosqueOS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

        services.AddIdentity<ApplicationUser, IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<IUnitOfWork, UnitOfWork>();

        services.AddScoped<IJwtTokenService, JwtTokenService>();

        services.AddMemoryCache();
        services.AddHttpClient<IQuranTextService, AlQuranCloudQuranService>(client =>
        {
            client.BaseAddress = new Uri("https://api.alquran.cloud/v1/");
            client.Timeout = TimeSpan.FromSeconds(60);
        });

        services.AddHostedService<QuranCacheWarmupService>();

        return services;
    }
}
