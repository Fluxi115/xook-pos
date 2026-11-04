using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;
using POS.Domain.Enums;

namespace POS.Application.Suscripcion;

public interface ISuscripcionGuard
{
    Task<bool> SuscripcionVigenteAsync(Guid tenantId, CancellationToken cancellationToken);
}

public sealed class SuscripcionGuard : ISuscripcionGuard
{
    private readonly IAppDbContext _db;

    public SuscripcionGuard(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> SuscripcionVigenteAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var tenant = await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);

        return tenant is not null
            && tenant.Estado == EstadoTenant.Activo
            && DateTime.UtcNow <= tenant.FechaVencimiento;
    }
}
