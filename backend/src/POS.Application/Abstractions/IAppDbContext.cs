using Microsoft.EntityFrameworkCore;
using POS.Domain.Entities;

namespace POS.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<Empresa> Empresas { get; }

    DbSet<Tenant> Tenants { get; }

    DbSet<Usuario> Usuarios { get; }

    DbSet<Categoria> Categorias { get; }

    DbSet<Producto> Productos { get; }

    DbSet<GrupoModificador> GruposModificador { get; }

    DbSet<OpcionModificador> OpcionesModificador { get; }

    DbSet<ProductoModificador> ProductosModificador { get; }

    DbSet<Venta> Ventas { get; }

    DbSet<VentaDetalle> VentaDetalles { get; }

    DbSet<TurnoCaja> TurnosCaja { get; }

    DbSet<MovimientoCaja> MovimientosCaja { get; }

    DbSet<CorteCaja> CortesCaja { get; }

    DbSet<PagoSuscripcion> PagosSuscripcion { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
