using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using POS.Application.Abstractions;
using POS.Infrastructure.Persistence;
using POS.Infrastructure.Security;

namespace POS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connection = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Falta ConnectionStrings:DefaultConnection.");
        Directory.CreateDirectory(DirectorioSqlite(connection));

        services.AddDbContext<AppDbContext>(options => options.UseSqlite(connection));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddScoped<DevDataSeeder>();
        return services;
    }

    private static string DirectorioSqlite(string connection)
    {
        const string clave = "Data Source=";
        var inicio = connection.IndexOf(clave, StringComparison.OrdinalIgnoreCase);
        if (inicio < 0)
        {
            return Directory.GetCurrentDirectory();
        }

        var ruta = connection[(inicio + clave.Length)..].Trim().Trim('"');
        var fin = ruta.IndexOf(';');
        if (fin >= 0)
        {
            ruta = ruta[..fin];
        }

        var directorio = Path.GetDirectoryName(ruta);
        return string.IsNullOrWhiteSpace(directorio) ? Directory.GetCurrentDirectory() : directorio;
    }
}
