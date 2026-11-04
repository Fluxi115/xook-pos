using Microsoft.Extensions.DependencyInjection;
using POS.Application.Auth;
using POS.Application.Caja;
using POS.Application.Catalogo;
using POS.Application.SuperAdmin;
using POS.Application.Suscripcion;
using POS.Application.TenantAdmin;
using POS.Application.Ventas;

namespace POS.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<AuthService>();
        services.AddScoped<CatalogoService>();
        services.AddScoped<VentaSyncService>();
        services.AddScoped<ISuscripcionGuard, SuscripcionGuard>();
        services.AddScoped<TenantAdminService>();
        services.AddScoped<TenantStoreService>();
        services.AddScoped<CajaTurnoService>();
        return services;
    }
}
