using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;
using POS.Domain.Entities;
using POS.Domain.Enums;

namespace POS.Application.SuperAdmin;

public sealed class TenantAdminService
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;

    public TenantAdminService(IAppDbContext db, IPasswordHasher hasher)
    {
        _db = db;
        _hasher = hasher;
    }

    public async Task<List<TenantAdminDto>> ListarAsync(CancellationToken cancellationToken)
    {
        var tenants = await _db.Tenants
            .AsNoTracking()
            .OrderBy(t => t.NombreComercial)
            .ToListAsync(cancellationToken);

        var conteos = await ContarUsuariosAsync(cancellationToken);
        return tenants.Select(tenant => Mapear(tenant, conteos.GetValueOrDefault(tenant.Id))).ToList();
    }

    public async Task<OperacionTenant> CrearAsync(CrearTenantRequest request, CancellationToken cancellationToken)
    {
        var nombre = request.NombreComercial.Trim();
        var rfc = request.RucRfc.Trim().ToUpperInvariant();
        var adminNombre = request.AdminNombre.Trim();
        var username = request.AdminUsername.Trim().ToLowerInvariant();
        var telefono = Limpiar(request.Telefono);
        if (!LogoValido(request.LogoUrl, out var logo, out var errorLogo))
        {
            return OperacionTenant.Fail(400, errorLogo);
        }

        if (nombre.Length == 0 || rfc.Length == 0 || adminNombre.Length == 0 || username.Length < 3 || string.IsNullOrWhiteSpace(request.AdminPassword))
        {
            return OperacionTenant.Fail(400, "Completa el negocio, el RFC y el administrador inicial.");
        }

        if (request.AdminPassword.Length < 6)
        {
            return OperacionTenant.Fail(400, "La contraseña del administrador debe tener al menos 6 caracteres.");
        }

        if (request.FechaVencimiento == default)
        {
            return OperacionTenant.Fail(400, "Indica la fecha de vencimiento.");
        }

        if (!CupoValido(request.MaxCajas, request.MaxMeseros))
        {
            return OperacionTenant.Fail(400, "Las cajas y los meseros van de 0 a 99.");
        }

        if (await _db.Tenants.AnyAsync(t => t.RucRfc == rfc, cancellationToken))
        {
            return OperacionTenant.Fail(409, "Ese RFC/RUC ya está registrado.");
        }

        if (await _db.Usuarios.IgnoreQueryFilters().AnyAsync(u => u.Username == username, cancellationToken))
        {
            return OperacionTenant.Fail(409, "Ese usuario ya está registrado.");
        }

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            NombreComercial = nombre,
            RucRfc = rfc,
            Telefono = telefono,
            LogoUrl = logo,
            MaxCajas = request.MaxCajas,
            MaxMeseros = request.MaxMeseros,
            Estado = EstadoTenant.Activo,
            FechaVencimiento = AUtc(request.FechaVencimiento),
            FechaCreacion = DateTime.UtcNow
        };

        var admin = new Usuario
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Nombre = adminNombre,
            Username = username,
            PasswordHash = _hasher.Hash(request.AdminPassword),
            Rol = RolUsuario.AdminSucursal,
            Activo = true
        };

        _db.Tenants.Add(tenant);
        _db.Usuarios.Add(admin);
        await _db.SaveChangesAsync(cancellationToken);
        return OperacionTenant.Ok(Mapear(tenant, new Cupo(1, 0, 0)));
    }

    public async Task<OperacionTenant> ActualizarAsync(Guid id, ActualizarTenantRequest request, CancellationToken cancellationToken)
    {
        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (tenant is null)
        {
            return OperacionTenant.Fail(404, "Sucursal no encontrada.");
        }

        var nombre = request.NombreComercial.Trim();
        var rfc = request.RucRfc.Trim().ToUpperInvariant();
        if (nombre.Length == 0 || rfc.Length == 0)
        {
            return OperacionTenant.Fail(400, "El nombre comercial y el RFC/RUC son obligatorios.");
        }

        var rfcOcupado = await _db.Tenants.AnyAsync(t => t.Id != id && t.RucRfc == rfc, cancellationToken);
        if (rfcOcupado)
        {
            return OperacionTenant.Fail(409, "Ese RFC/RUC ya está registrado.");
        }

        tenant.NombreComercial = nombre;
        tenant.RucRfc = rfc;
        if (!LogoValido(request.LogoUrl, out var logo, out var errorLogo))
        {
            return OperacionTenant.Fail(400, errorLogo);
        }

        if (!CupoValido(request.MaxCajas, request.MaxMeseros))
        {
            return OperacionTenant.Fail(400, "Las cajas y los meseros van de 0 a 99.");
        }

        tenant.Telefono = Limpiar(request.Telefono);
        tenant.LogoUrl = logo;
        tenant.MaxCajas = request.MaxCajas;
        tenant.MaxMeseros = request.MaxMeseros;
        await _db.SaveChangesAsync(cancellationToken);

        var conteos = await ContarUsuariosAsync(cancellationToken);
        return OperacionTenant.Ok(Mapear(tenant, conteos.GetValueOrDefault(id)));
    }

    public async Task<OperacionTenant> ActualizarSuscripcionAsync(
        Guid id,
        ActualizarSuscripcionRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Estado) || request.FechaVencimiento == default)
        {
            return OperacionTenant.Fail(400, "Indica un estado y una fecha de vencimiento válidos.");
        }

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (tenant is null)
        {
            return OperacionTenant.Fail(404, "Sucursal no encontrada.");
        }

        tenant.Estado = request.Estado;
        tenant.FechaVencimiento = AUtc(request.FechaVencimiento);
        await _db.SaveChangesAsync(cancellationToken);

        var conteos = await ContarUsuariosAsync(cancellationToken);
        return OperacionTenant.Ok(Mapear(tenant, conteos.GetValueOrDefault(id)));
    }

    public async Task<List<PagoSuscripcionDto>> ListarPagosAsync(CancellationToken cancellationToken)
    {
        return await _db.PagosSuscripcion
            .IgnoreQueryFilters()
            .AsNoTracking()
            .OrderByDescending(p => p.FechaPago)
            .Take(100)
            .Select(p => new PagoSuscripcionDto
            {
                Id = p.Id,
                TenantId = p.TenantId,
                NombreComercial = p.Tenant.NombreComercial,
                Monto = p.Monto,
                Medio = p.Medio.ToString(),
                FechaPago = p.FechaPago,
                Meses = p.Meses,
                VigenciaHasta = p.VigenciaHasta,
                Nota = p.Nota
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<OperacionPago> RegistrarPagoAsync(Guid id, RegistrarPagoRequest request, CancellationToken cancellationToken)
    {
        if (request.Monto <= 0 || request.Monto > 999_999.99m)
        {
            return OperacionPago.Fail(400, "Indica el monto recibido.");
        }

        if (request.Meses is not 1 and not 12)
        {
            return OperacionPago.Fail(400, "El periodo debe ser de un mes o un año.");
        }

        if (!Enum.IsDefined(request.Medio))
        {
            return OperacionPago.Fail(400, "El pago es en efectivo o por transferencia.");
        }

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (tenant is null)
        {
            return OperacionPago.Fail(404, "Sucursal no encontrada.");
        }

        var ahora = DateTime.UtcNow;
        var vigencia = FinDeDia(tenant.FechaVencimiento > ahora ? tenant.FechaVencimiento.AddMonths(request.Meses) : ahora.AddMonths(request.Meses));
        var pago = new PagoSuscripcion
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Monto = decimal.Round(request.Monto, 2, MidpointRounding.AwayFromZero),
            Medio = request.Medio,
            FechaPago = ahora,
            Meses = request.Meses,
            VigenciaHasta = vigencia,
            Nota = Limpiar(request.Nota)
        };
        if (pago.Nota is { Length: > 200 })
        {
            return OperacionPago.Fail(400, "La nota admite hasta 200 caracteres.");
        }

        tenant.Estado = EstadoTenant.Activo;
        tenant.FechaVencimiento = vigencia;
        _db.PagosSuscripcion.Add(pago);
        await _db.SaveChangesAsync(cancellationToken);
        return OperacionPago.Ok(new PagoSuscripcionDto
        {
            Id = pago.Id,
            TenantId = pago.TenantId,
            NombreComercial = tenant.NombreComercial,
            Monto = pago.Monto,
            Medio = pago.Medio.ToString(),
            FechaPago = pago.FechaPago,
            Meses = pago.Meses,
            VigenciaHasta = pago.VigenciaHasta,
            Nota = pago.Nota
        });
    }

    private async Task<Dictionary<Guid, Cupo>> ContarUsuariosAsync(CancellationToken cancellationToken)
    {
        var filas = await _db.Usuarios
            .IgnoreQueryFilters()
            .GroupBy(u => new { u.TenantId, u.Rol, u.Activo })
            .Select(grupo => new
            {
                grupo.Key.TenantId,
                grupo.Key.Rol,
                grupo.Key.Activo,
                Total = grupo.Count()
            })
            .ToListAsync(cancellationToken);

        return filas
            .GroupBy(fila => fila.TenantId)
            .ToDictionary(
                grupo => grupo.Key,
                grupo => new Cupo(
                    grupo.Sum(fila => fila.Total),
                    grupo.Where(fila => fila.Activo && fila.Rol == RolUsuario.Cajero).Sum(fila => fila.Total),
                    grupo.Where(fila => fila.Activo && fila.Rol == RolUsuario.Mesero).Sum(fila => fila.Total)));
    }

    private static bool CupoValido(int cajas, int meseros) => cajas is >= 0 and <= 99 && meseros is >= 0 and <= 99;

    private static TenantAdminDto Mapear(Tenant tenant, Cupo cupo) => new()
    {
        Id = tenant.Id,
        NombreComercial = tenant.NombreComercial,
        RucRfc = tenant.RucRfc,
        Telefono = tenant.Telefono,
        LogoUrl = tenant.LogoUrl,
        Estado = tenant.Estado.ToString(),
        FechaVencimiento = tenant.FechaVencimiento,
        TotalUsuarios = cupo.Total,
        MaxCajas = tenant.MaxCajas,
        MaxMeseros = tenant.MaxMeseros,
        Cajas = cupo.Cajas,
        Meseros = cupo.Meseros
    };

    private readonly record struct Cupo(int Total, int Cajas, int Meseros);

    private static bool LogoValido(string? valor, out string? logo, out string error)
    {
        logo = Limpiar(valor);
        error = string.Empty;
        if (logo is null)
        {
            return true;
        }

        var esUrl = logo.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            || logo.StartsWith("http://", StringComparison.OrdinalIgnoreCase);
        var esImagen = logo.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase)
            || logo.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase)
            || logo.StartsWith("data:image/webp;base64,", StringComparison.OrdinalIgnoreCase);
        if (logo.Length > 400_000 || (esUrl && logo.Length > 500) || (!esUrl && !esImagen))
        {
            error = "El logo debe ser una imagen PNG, JPG o WebP de menos de 300 KB.";
            logo = null;
            return false;
        }

        return true;
    }

    private static string? Limpiar(string? valor)
    {
        var texto = valor?.Trim();
        return string.IsNullOrEmpty(texto) ? null : texto;
    }

    private static DateTime AUtc(DateTime fecha) =>
        fecha.Kind == DateTimeKind.Utc ? fecha : fecha.Kind == DateTimeKind.Local
            ? fecha.ToUniversalTime()
            : DateTime.SpecifyKind(fecha, DateTimeKind.Utc);

    private static DateTime FinDeDia(DateTime fecha)
    {
        var utc = AUtc(fecha);
        return new DateTime(utc.Year, utc.Month, utc.Day, 23, 59, 59, 999, DateTimeKind.Utc);
    }
}
