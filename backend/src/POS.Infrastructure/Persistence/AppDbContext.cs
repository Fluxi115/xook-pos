using System.Reflection;
using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;
using POS.Domain.Common;
using POS.Domain.Entities;
using POS.Domain.Enums;

namespace POS.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext, IAppDbContext
{
    private readonly ITenantProvider _tenantProvider;
    private readonly ICurrentUser? _currentUser;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        ITenantProvider tenantProvider,
        ICurrentUser? currentUser = null)
        : base(options)
    {
        _tenantProvider = tenantProvider;
        _currentUser = currentUser;
    }

    public Guid CurrentTenantId => _tenantProvider.TenantId;

    public DbSet<Tenant> Tenants => Set<Tenant>();

    public DbSet<Usuario> Usuarios => Set<Usuario>();

    public DbSet<Categoria> Categorias => Set<Categoria>();

    public DbSet<Producto> Productos => Set<Producto>();

    public DbSet<GrupoModificador> GruposModificador => Set<GrupoModificador>();

    public DbSet<OpcionModificador> OpcionesModificador => Set<OpcionModificador>();

    public DbSet<ProductoModificador> ProductosModificador => Set<ProductoModificador>();

    public DbSet<Venta> Ventas => Set<Venta>();

    public DbSet<VentaDetalle> VentaDetalles => Set<VentaDetalle>();

    public DbSet<TurnoCaja> TurnosCaja => Set<TurnoCaja>();

    public DbSet<MovimientoCaja> MovimientosCaja => Set<MovimientoCaja>();

    public DbSet<CorteCaja> CortesCaja => Set<CorteCaja>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        ApplyTenantQueryFilters(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = CurrentTenantId;
        foreach (var entry in ChangeTracker.Entries<IMustHaveTenant>())
        {
            if (entry.State != EntityState.Added)
            {
                continue;
            }

            var conservaTenantExplicito = _currentUser?.Rol == nameof(RolUsuario.SuperAdmin)
                && entry.Entity.TenantId != Guid.Empty;
            if (conservaTenantExplicito)
            {
                continue;
            }

            if (tenantId != Guid.Empty)
            {
                entry.Entity.TenantId = tenantId;
            }
            else if (entry.Entity.TenantId == Guid.Empty)
            {
                throw new InvalidOperationException("TenantId es requerido para guardar la entidad.");
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyTenantQueryFilters(ModelBuilder modelBuilder)
    {
        var tenantTypes = modelBuilder.Model
            .GetEntityTypes()
            .Select(entityType => entityType.ClrType)
            .Where(type => typeof(IMustHaveTenant).IsAssignableFrom(type))
            .ToList();

        foreach (var type in tenantTypes)
        {
            var method = typeof(AppDbContext).GetMethod(
                nameof(ApplyTenantQueryFilter),
                BindingFlags.Instance | BindingFlags.NonPublic)
                ?? throw new InvalidOperationException("No se encontró el filtro global de tenant.");

            method.MakeGenericMethod(type).Invoke(this, [modelBuilder]);
        }
    }

    private void ApplyTenantQueryFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, IMustHaveTenant
    {
        modelBuilder.Entity<TEntity>().HasQueryFilter(entity => entity.TenantId == CurrentTenantId);
    }
}
