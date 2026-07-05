using Microsoft.Extensions.DependencyInjection;

namespace MosqueOS.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        // Application services register here as the layer grows.
        return services;
    }
}
