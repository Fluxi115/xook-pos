using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using POS.Application.Abstractions;

namespace POS.Infrastructure.Persistence;

public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connection = NpgsqlConnectionString.Normalize(
            Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? Environment.GetEnvironmentVariable("POS_CONNECTION")
            ?? "Host=localhost;Port=5432;Database=xookpos;Username=postgres;Password=postgres;SSL Mode=Disable");

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connection)
            .Options;

        return new AppDbContext(options, new DesignTimeTenant());
    }

    private sealed class DesignTimeTenant : ITenantProvider
    {
        public Guid TenantId => Guid.Empty;
    }
}
