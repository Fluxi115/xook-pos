using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;

namespace POS.Application.Catalogo;

public sealed class CatalogoService
{
    private readonly IAppDbContext _db;
    private readonly ITenantProvider _tenantProvider;

    public CatalogoService(IAppDbContext db, ITenantProvider tenantProvider)
    {
        _db = db;
        _tenantProvider = tenantProvider;
    }

    public async Task<CatalogoDto?> ObtenerAsync(CancellationToken cancellationToken)
    {
        var tenant = await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == _tenantProvider.TenantId, cancellationToken);

        if (tenant is null)
        {
            return null;
        }

        var categorias = await _db.Categorias
            .AsNoTracking()
            .OrderBy(c => c.Orden)
            .ThenBy(c => c.Nombre)
            .Select(c => new CategoriaDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Orden = c.Orden,
                IconoUrl = c.IconoUrl
            })
            .ToListAsync(cancellationToken);

        var productos = await _db.Productos
            .AsNoTracking()
            .Include(p => p.Grupos)
                .ThenInclude(enlace => enlace.GrupoModificador)
                    .ThenInclude(grupo => grupo.Opciones)
            .OrderBy(p => p.Nombre)
            .ToListAsync(cancellationToken);

        return new CatalogoDto
        {
            Tenant = new TenantInfoDto
            {
                Id = tenant.Id,
                NombreComercial = tenant.NombreComercial,
                RucRfc = tenant.RucRfc,
                LogoUrl = tenant.LogoUrl,
                Telefono = tenant.Telefono,
                Direccion = tenant.Direccion,
                MensajeTicket = tenant.MensajeTicket,
                TasaImpuesto = tenant.TasaImpuesto,
                Estado = tenant.Estado.ToString(),
                FechaVencimiento = tenant.FechaVencimiento
            },
            Categorias = categorias,
            Productos = productos.Select(producto => new ProductoDto
            {
                Id = producto.Id,
                CategoriaId = producto.CategoriaId,
                Nombre = producto.Nombre,
                Descripcion = producto.Descripcion,
                PrecioBase = producto.PrecioBase,
                FotoUrl = producto.FotoUrl,
                Disponible = producto.Disponible,
                Modificadores = producto.Grupos
                    .Select(enlace => enlace.GrupoModificador)
                    .OrderBy(grupo => grupo.Nombre)
                    .Select(grupo => new GrupoModificadorDto
                    {
                        Id = grupo.Id,
                        Nombre = grupo.Nombre,
                        EsObligatorio = grupo.EsObligatorio,
                        SeleccionMaxima = grupo.SeleccionMaxima,
                        Opciones = grupo.Opciones
                            .OrderBy(opcion => opcion.Nombre)
                            .Select(opcion => new OpcionModificadorDto
                            {
                                Id = opcion.Id,
                                Nombre = opcion.Nombre,
                                PrecioAdicional = opcion.PrecioAdicional
                            })
                            .ToList()
                    })
                    .ToList()
            }).ToList()
        };
    }
}
