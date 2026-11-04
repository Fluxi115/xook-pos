using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using POS.Application.Abstractions;

namespace POS.Infrastructure.Persistence;

public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connection = Environment.GetEnvironmentVariable("POS_CONNECTION")
            ?? "Data Source=pos.db";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        return new AppDbContext(options, new DesignTimeTenant());
    }

    private sealed class DesignTimeTenant : ITenantProvider
    {
        public Guid TenantId => Guid.Empty;
    }
}
