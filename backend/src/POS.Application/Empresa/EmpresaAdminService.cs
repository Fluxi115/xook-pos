using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;
using POS.Application.Common;
using POS.Application.TenantAdmin;
using POS.Domain.Entities;
using POS.Domain.Enums;

namespace POS.Application.Empresas;

public sealed class EmpresaAdminService
{
    private readonly IAppDbContext _db;
    private readonly ITenantProvider _tenant;
    private readonly ICurrentUser _usuario;
    private readonly IPasswordHasher _hasher;

    public EmpresaAdminService(IAppDbContext db, ITenantProvider tenant, ICurrentUser usuario, IPasswordHasher hasher)
    {
        _db = db;
        _tenant = tenant;
        _usuario = usuario;
        _hasher = hasher;
    }

    public async Task<Resultado<EmpresaPanelDto>> PanelAsync(CancellationToken cancellationToken)
    {
        var empresaId = await EmpresaActualAsync(cancellationToken);
        if (empresaId is null)
        {
            return Resultado<EmpresaPanelDto>.Fail(403, "Esta cuenta no administra una empresa.");
        }

        return Resultado<EmpresaPanelDto>.Ok(await ArmarAsync(empresaId.Value, cancellationToken));
    }

    public Task<Resultado<SucursalEmpresaDto>> CrearSucursalPropiaAsync(CrearSucursalEmpresaRequest request, CancellationToken cancellationToken) =>
        CrearEnEmpresaDelUsuarioAsync(request, cancellationToken);

    public async Task<Resultado<SucursalEmpresaDto>> CrearSucursalAsync(
        Guid empresaId,
        CrearSucursalEmpresaRequest request,
        CancellationToken cancellationToken)
    {
        var creada = await CrearInternoAsync(empresaId, request, cancellationToken);
        if (!creada.Exitoso || creada.Valor is null)
        {
            return Resultado<SucursalEmpresaDto>.Fail(creada.StatusCode, creada.Mensaje ?? "No se pudo crear la sucursal.");
        }

        return Resultado<SucursalEmpresaDto>.Ok(await MapearAsync(creada.Valor, cancellationToken));
    }

    public async Task<Resultado<UsuarioCreadoDto>> CrearGerenteAsync(
        Guid sucursalId,
        CrearGerenteRequest request,
        CancellationToken cancellationToken)
    {
        var empresaId = await EmpresaActualAsync(cancellationToken);
        if (empresaId is null)
        {
            return Resultado<UsuarioCreadoDto>.Fail(403, "Esta cuenta no administra una empresa.");
        }

        var nombre = request.Nombre.Trim();
        if (nombre.Length == 0 || string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
        {
            return Resultado<UsuarioCreadoDto>.Fail(400, "Indica el nombre del gerente y una contraseña de al menos 6 caracteres.");
        }

        var sucursal = await _db.Tenants
            .AsNoTracking()
            .Where(t => t.Id == sucursalId && t.EmpresaId == empresaId)
            .Select(t => new { t.Id, t.Slug, Empresa = t.Empresa.Slug })
            .FirstOrDefaultAsync(cancellationToken);
        if (sucursal is null)
        {
            return Resultado<UsuarioCreadoDto>.Fail(404, "Esa sucursal no pertenece a tu empresa.");
        }

        var usuario = await CrearUsuarioAsync(sucursal.Id, sucursal.Empresa, sucursal.Slug, nombre, request.Password, RolUsuario.AdminSucursal, cancellationToken);
        return usuario;
    }

    private async Task<Resultado<SucursalEmpresaDto>> CrearEnEmpresaDelUsuarioAsync(
        CrearSucursalEmpresaRequest request,
        CancellationToken cancellationToken)
    {
        var empresaId = await EmpresaActualAsync(cancellationToken);
        if (empresaId is null)
        {
            return Resultado<SucursalEmpresaDto>.Fail(403, "Esta cuenta no administra una empresa.");
        }

        var creada = await CrearInternoAsync(empresaId.Value, request, cancellationToken);
        if (!creada.Exitoso || creada.Valor is null)
        {
            return Resultado<SucursalEmpresaDto>.Fail(creada.StatusCode, creada.Mensaje ?? "No se pudo crear la sucursal.");
        }

        return Resultado<SucursalEmpresaDto>.Ok(await MapearAsync(creada.Valor, cancellationToken));
    }

    public async Task<Resultado<Tenant>> CrearInternoAsync(
        Guid empresaId,
        CrearSucursalEmpresaRequest request,
        CancellationToken cancellationToken)
    {
        var empresa = await _db.Empresas.AsNoTracking().FirstOrDefaultAsync(e => e.Id == empresaId, cancellationToken);
        if (empresa is null)
        {
            return Resultado<Tenant>.Fail(404, "Empresa no encontrada.");
        }

        var nombre = request.NombreComercial.Trim();
        var codigo = NombreUsuario.Codigo(request.Codigo);
        var slug = NombreUsuario.Slug(nombre);
        if (nombre.Length == 0 || codigo.Length < 3 || slug.Length < 2)
        {
            return Resultado<Tenant>.Fail(400, "Indica el nombre y un código de sucursal, por ejemplo TAQ-CENTRO-01.");
        }

        if (await _db.Tenants.AnyAsync(t => t.Codigo == codigo, cancellationToken))
        {
            return Resultado<Tenant>.Fail(409, "Ese código de sucursal ya está registrado.");
        }

        if (await _db.Tenants.AnyAsync(t => t.EmpresaId == empresaId && t.Slug == slug, cancellationToken))
        {
            slug = await SlugLibreAsync(empresaId, slug, cancellationToken);
        }

        var raiz = await _db.Tenants
            .AsNoTracking()
            .Where(t => t.EmpresaId == empresaId)
            .OrderBy(t => t.FechaCreacion)
            .FirstOrDefaultAsync(cancellationToken);
        if (request.ParentSucursalId is Guid padreId)
        {
            var visitados = new HashSet<Guid>();
            Guid? actual = padreId;
            while (actual is Guid id)
            {
                if (!visitados.Add(id))
                {
                    return Resultado<Tenant>.Fail(400, "La sucursal padre forma un ciclo.");
                }

                var padre = await _db.Tenants
                    .AsNoTracking()
                    .Where(t => t.Id == id)
                    .Select(t => new { t.EmpresaId, t.ParentSucursalId })
                    .FirstOrDefaultAsync(cancellationToken);
                if (padre is null || padre.EmpresaId != empresaId)
                {
                    return Resultado<Tenant>.Fail(400, "La sucursal padre no pertenece a esta empresa.");
                }

                actual = padre.ParentSucursalId;
            }
        }

        var sucursal = new Tenant
        {
            Id = Guid.NewGuid(),
            EmpresaId = empresaId,
            ParentSucursalId = request.ParentSucursalId,
            Codigo = codigo,
            Slug = slug,
            NombreComercial = nombre,
            RucRfc = raiz?.RucRfc ?? "XAXX010101000",
            Telefono = request.Telefono?.Trim(),
            Estado = raiz?.Estado ?? EstadoTenant.Activo,
            FechaVencimiento = raiz?.FechaVencimiento ?? DateTime.UtcNow.AddMonths(1),
            FechaCreacion = DateTime.UtcNow,
            MaxCajas = raiz?.MaxCajas ?? 1,
            MaxMeseros = raiz?.MaxMeseros ?? 1,
            TasaImpuesto = raiz?.TasaImpuesto ?? 0
        };
        _db.Tenants.Add(sucursal);
        await _db.SaveChangesAsync(cancellationToken);
        return Resultado<Tenant>.Ok(sucursal);
    }

    private async Task<Resultado<UsuarioCreadoDto>> CrearUsuarioAsync(
        Guid sucursalId,
        string empresaSlug,
        string sucursalSlug,
        string nombre,
        string password,
        RolUsuario rol,
        CancellationToken cancellationToken)
    {
        var baseNombre = NombreUsuario.DeSucursal(empresaSlug, sucursalSlug, nombre);
        if (baseNombre.Count(c => c == '-') < 2 || baseNombre.Length < 5)
        {
            return Resultado<UsuarioCreadoDto>.Fail(400, "El nombre no alcanza para armar el usuario de acceso.");
        }

        var username = await NombreUsuario.Disponible(_db, baseNombre, cancellationToken);
        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            TenantId = sucursalId,
            Nombre = nombre,
            Username = username,
            PasswordHash = _hasher.Hash(password),
            Rol = rol,
            Activo = true
        };
        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync(cancellationToken);
        return Resultado<UsuarioCreadoDto>.Ok(new UsuarioCreadoDto
        {
            Id = usuario.Id,
            Nombre = usuario.Nombre,
            Username = usuario.Username,
            Rol = usuario.Rol.ToString(),
            SucursalId = sucursalId
        });
    }

    private async Task<Guid?> EmpresaActualAsync(CancellationToken cancellationToken)
    {
        if (_usuario.Rol != nameof(RolUsuario.AdminEmpresa) || _tenant.TenantId == Guid.Empty)
        {
            return null;
        }

        return await _db.Tenants
            .AsNoTracking()
            .Where(t => t.Id == _tenant.TenantId)
            .Select(t => (Guid?)t.EmpresaId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<EmpresaPanelDto> ArmarAsync(Guid empresaId, CancellationToken cancellationToken)
    {
        var empresa = await _db.Empresas.AsNoTracking().FirstAsync(e => e.Id == empresaId, cancellationToken);
        var sucursales = await _db.Tenants
            .AsNoTracking()
            .Where(t => t.EmpresaId == empresaId)
            .OrderBy(t => t.NombreComercial)
            .ToListAsync(cancellationToken);
        var nombres = sucursales.ToDictionary(t => t.Id, t => t.NombreComercial);
        return new EmpresaPanelDto
        {
            Id = empresa.Id,
            Nombre = empresa.Nombre,
            Slug = empresa.Slug,
            Sucursales = sucursales.Select(t => new SucursalEmpresaDto
            {
                Id = t.Id,
                NombreComercial = t.NombreComercial,
                Codigo = t.Codigo,
                Slug = t.Slug,
                ParentSucursalId = t.ParentSucursalId,
                ParentNombre = t.ParentSucursalId is Guid padre ? nombres.GetValueOrDefault(padre) : null,
                FechaVencimiento = t.FechaVencimiento
            }).ToList()
        };
    }

    private async Task<SucursalEmpresaDto> MapearAsync(Tenant sucursal, CancellationToken cancellationToken)
    {
        string? padre = null;
        if (sucursal.ParentSucursalId is Guid padreId)
        {
            padre = await _db.Tenants
                .AsNoTracking()
                .Where(t => t.Id == padreId)
                .Select(t => t.NombreComercial)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new SucursalEmpresaDto
        {
            Id = sucursal.Id,
            NombreComercial = sucursal.NombreComercial,
            Codigo = sucursal.Codigo,
            Slug = sucursal.Slug,
            ParentSucursalId = sucursal.ParentSucursalId,
            ParentNombre = padre,
            FechaVencimiento = sucursal.FechaVencimiento
        };
    }

    private async Task<string> SlugLibreAsync(Guid empresaId, string slug, CancellationToken cancellationToken)
    {
        for (var numero = 2; numero < 50; numero++)
        {
            var candidato = $"{slug}-{numero}";
            var ocupado = await _db.Tenants.AnyAsync(t => t.EmpresaId == empresaId && t.Slug == candidato, cancellationToken);
            if (!ocupado)
            {
                return candidato;
            }
        }

        return $"{slug}-{Guid.NewGuid().ToString("N")[..4]}";
    }
}
