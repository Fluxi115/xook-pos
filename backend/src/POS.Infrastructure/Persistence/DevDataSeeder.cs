using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;
using POS.Domain.Entities;
using POS.Domain.Enums;

namespace POS.Infrastructure.Persistence;

public sealed class DevDataSeeder
{
    public static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private const string DemoPassword = "Admin123!";

    private readonly AppDbContext _db;
    private readonly IPasswordHasher _hasher;

    public DevDataSeeder(AppDbContext db, IPasswordHasher hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await _db.Database.MigrateAsync(cancellationToken);
        if (!await _db.Tenants.AnyAsync(cancellationToken))
        {
            await CrearDemoAsync(cancellationToken);
        }

        await AsegurarSuperAdminAsync(cancellationToken);
    }

    private async Task CrearDemoAsync(CancellationToken cancellationToken)
    {
        var ahora = DateTime.UtcNow;
        var hash = _hasher.Hash(DemoPassword);

        var tacosId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001");
        var bebidasId = Guid.Parse("aaaaaaaa-0000-0000-0000-000000000002");
        var pastorId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000001");
        var suaderoId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000002");
        var horchataId = Guid.Parse("bbbbbbbb-0000-0000-0000-000000000003");
        var complementosId = Guid.Parse("cccccccc-0000-0000-0000-000000000001");
        var tamanoId = Guid.Parse("cccccccc-0000-0000-0000-000000000002");

        var tenant = new Tenant
        {
            Id = TenantId,
            NombreComercial = "Taquería del Centro",
            RucRfc = "XAXX010101000",
            Estado = EstadoTenant.Activo,
            FechaVencimiento = ahora.AddYears(1),
            FechaCreacion = ahora
        };

        var admin = Usuario(Guid.Parse("22222222-2222-2222-2222-222222222222"), "Administrador", "admin", RolUsuario.AdminSucursal, hash);
        var cajero = Usuario(Guid.Parse("33333333-3333-3333-3333-333333333333"), "Caja 1", "cajero", RolUsuario.Cajero, hash);

        var tacos = new Categoria { Id = tacosId, TenantId = TenantId, Nombre = "Tacos", Orden = 1 };
        var bebidas = new Categoria { Id = bebidasId, TenantId = TenantId, Nombre = "Bebidas", Orden = 2 };

        var pastor = Producto(pastorId, tacosId, "Taco de pastor", "Cerdo adobado con piña", 28m);
        var suadero = Producto(suaderoId, tacosId, "Taco de suadero", "Suadero a la plancha", 30m);
        var horchata = Producto(horchataId, bebidasId, "Agua de horchata", "Vaso preparado al momento", 22m);

        var complementos = new GrupoModificador
        {
            Id = complementosId,
            TenantId = TenantId,
            Nombre = "Complementos",
            EsObligatorio = false,
            SeleccionMaxima = 3
        };
        var tamano = new GrupoModificador
        {
            Id = tamanoId,
            TenantId = TenantId,
            Nombre = "Tamaño",
            EsObligatorio = true,
            SeleccionMaxima = 1
        };

        _db.AddRange(
            tenant,
            admin,
            cajero,
            tacos,
            bebidas,
            pastor,
            suadero,
            horchata,
            complementos,
            tamano,
            Opcion(complementosId, "Queso extra", 15m),
            Opcion(complementosId, "Sin cebolla", 0m),
            Opcion(complementosId, "Piña", 0m),
            Opcion(tamanoId, "Chico", 0m),
            Opcion(tamanoId, "Grande", 10m),
            Enlace(pastorId, complementosId),
            Enlace(suaderoId, complementosId),
            Enlace(horchataId, tamanoId));

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task AsegurarSuperAdminAsync(CancellationToken cancellationToken)
    {
        var existe = await _db.Usuarios
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Username == "superadmin", cancellationToken);
        if (existe)
        {
            return;
        }

        var tenantId = await _db.Tenants.Select(t => t.Id).FirstAsync(cancellationToken);
        _db.Usuarios.Add(new Usuario
        {
            Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
            TenantId = tenantId,
            Nombre = "Super administrador",
            Username = "superadmin",
            PasswordHash = _hasher.Hash(DemoPassword),
            Rol = RolUsuario.SuperAdmin,
            Activo = true
        });
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static Usuario Usuario(Guid id, string nombre, string username, RolUsuario rol, string hash) => new()
    {
        Id = id,
        TenantId = TenantId,
        Nombre = nombre,
        Username = username,
        PasswordHash = hash,
        Rol = rol,
        Activo = true
    };

    private static Producto Producto(Guid id, Guid categoriaId, string nombre, string descripcion, decimal precio) => new()
    {
        Id = id,
        TenantId = TenantId,
        CategoriaId = categoriaId,
        Nombre = nombre,
        Descripcion = descripcion,
        PrecioBase = precio,
        Disponible = true
    };

    private static OpcionModificador Opcion(Guid grupoId, string nombre, decimal precio) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = TenantId,
        GrupoModificadorId = grupoId,
        Nombre = nombre,
        PrecioAdicional = precio
    };

    private static ProductoModificador Enlace(Guid productoId, Guid grupoId) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = TenantId,
        ProductoId = productoId,
        GrupoModificadorId = grupoId
    };
}
