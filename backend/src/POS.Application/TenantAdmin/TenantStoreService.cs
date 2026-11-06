using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;
using POS.Application.Caja;
using POS.Domain.Entities;
using POS.Domain.Enums;

namespace POS.Application.TenantAdmin;

public sealed class TenantStoreService
{
    private readonly IAppDbContext _db;
    private readonly ITenantProvider _tenant;
    private readonly IPasswordHasher _hasher;
    private readonly CajaTurnoService _caja;

    public TenantStoreService(IAppDbContext db, ITenantProvider tenant, IPasswordHasher hasher, CajaTurnoService caja)
    {
        _db = db;
        _tenant = tenant;
        _hasher = hasher;
        _caja = caja;
    }

    public async Task<Resultado<DashboardDto>> MetricasAsync(CancellationToken cancellationToken)
    {
        if (_tenant.TenantId == Guid.Empty)
        {
            return Resultado<DashboardDto>.Fail(401, "El token no incluye una sucursal válida.");
        }

        var sucursal = await _db.Tenants
            .AsNoTracking()
            .Where(t => t.Id == _tenant.TenantId)
            .Select(t => new { t.NombreComercial, t.LogoUrl })
            .FirstOrDefaultAsync(cancellationToken);

        if (sucursal is null)
        {
            return Resultado<DashboardDto>.Fail(404, "Sucursal no encontrada.");
        }

        var (inicioUtc, finUtc) = DiaActualUtc();
        var delDia = await _db.Ventas
            .AsNoTracking()
            .Where(v => !v.Cancelada && v.FechaHora >= inicioUtc && v.FechaHora < finUtc)
            .Select(v => new { v.Total, v.MetodoPago })
            .ToListAsync(cancellationToken);

        var ultimas = await _db.Ventas
            .AsNoTracking()
            .OrderByDescending(v => v.FechaHora)
            .Take(12)
            .Select(v => new VentaResumenDto
            {
                Id = v.Id,
                FolioVenta = v.FolioVenta,
                FechaHora = v.FechaHora,
                Total = v.Total,
                MetodoPago = v.MetodoPago.ToString(),
                Cajero = v.Usuario.Nombre,
                Cancelada = v.Cancelada,
                MotivoCancelacion = v.MotivoCancelacion,
                FechaCancelacion = v.FechaCancelacion
            })
            .ToListAsync(cancellationToken);

        decimal ventas = 0, efectivo = 0, tarjeta = 0, transferencia = 0, mixto = 0;
        foreach (var venta in delDia)
        {
            ventas += venta.Total;
            switch (venta.MetodoPago)
            {
                case MetodoPago.Efectivo:
                    efectivo += venta.Total;
                    break;
                case MetodoPago.Tarjeta:
                    tarjeta += venta.Total;
                    break;
                case MetodoPago.Transferencia:
                    transferencia += venta.Total;
                    break;
                case MetodoPago.Mixto:
                    mixto += venta.Total;
                    break;
            }
        }

        var ordenes = delDia.Count;
        return Resultado<DashboardDto>.Ok(new DashboardDto
        {
            NombreComercial = sucursal.NombreComercial,
            LogoUrl = sucursal.LogoUrl,
            VentasDelDia = ventas,
            OrdenesDelDia = ordenes,
            TicketPromedio = ordenes == 0 ? 0 : decimal.Round(ventas / ordenes, 2),
            Efectivo = efectivo,
            Tarjeta = tarjeta,
            Transferencia = transferencia,
            Mixto = mixto,
            UltimasVentas = ultimas
        });
    }

    public async Task<List<ProductoAdminDto>> ListarProductosAsync(CancellationToken cancellationToken)
    {
        var productos = await _db.Productos
            .AsNoTracking()
            .Include(p => p.Categoria)
            .Include(p => p.Grupos)
                .ThenInclude(enlace => enlace.GrupoModificador)
            .OrderBy(p => p.Nombre)
            .ToListAsync(cancellationToken);

        return productos.Select(Mapear).ToList();
    }

    public Task<List<CategoriaAdminDto>> ListarCategoriasAsync(CancellationToken cancellationToken)
    {
        return _db.Categorias
            .AsNoTracking()
            .OrderBy(c => c.Orden)
            .ThenBy(c => c.Nombre)
            .Select(c => new CategoriaAdminDto { Id = c.Id, Nombre = c.Nombre, Orden = c.Orden })
            .ToListAsync(cancellationToken);
    }

    public Task<List<GrupoModificadorAdminDto>> ListarModificadoresAsync(CancellationToken cancellationToken)
    {
        return _db.GruposModificador
            .AsNoTracking()
            .OrderBy(g => g.Nombre)
            .Select(g => new GrupoModificadorAdminDto
            {
                Id = g.Id,
                Nombre = g.Nombre,
                EsObligatorio = g.EsObligatorio,
                SeleccionMaxima = g.SeleccionMaxima
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<Resultado<ProductoAdminDto>> CrearProductoAsync(GuardarProductoRequest request, CancellationToken cancellationToken)
    {
        var validado = await ValidarProductoAsync(request, cancellationToken);
        if (validado.Error is not null)
        {
            return Resultado<ProductoAdminDto>.Fail(validado.Status, validado.Error);
        }

        var producto = new Producto
        {
            Id = Guid.NewGuid(),
            CategoriaId = request.CategoriaId,
            Nombre = validado.Nombre,
            Descripcion = validado.Descripcion,
            PrecioBase = request.PrecioBase,
            FotoUrl = validado.Foto,
            Disponible = request.Disponible
        };
        _db.Productos.Add(producto);
        AgregarGrupos(producto.Id, validado.Grupos);
        await _db.SaveChangesAsync(cancellationToken);
        return Resultado<ProductoAdminDto>.Ok(await CargarProductoAsync(producto.Id, cancellationToken));
    }

    public async Task<Resultado<ProductoAdminDto>> ActualizarProductoAsync(
        Guid id,
        GuardarProductoRequest request,
        CancellationToken cancellationToken)
    {
        var producto = await _db.Productos.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (producto is null)
        {
            return Resultado<ProductoAdminDto>.Fail(404, "Producto no encontrado.");
        }

        var validado = await ValidarProductoAsync(request, cancellationToken);
        if (validado.Error is not null)
        {
            return Resultado<ProductoAdminDto>.Fail(validado.Status, validado.Error);
        }

        producto.CategoriaId = request.CategoriaId;
        producto.Nombre = validado.Nombre;
        producto.Descripcion = validado.Descripcion;
        producto.PrecioBase = request.PrecioBase;
        producto.FotoUrl = validado.Foto;
        producto.Disponible = request.Disponible;

        var actuales = await _db.ProductosModificador.Where(enlace => enlace.ProductoId == id).ToListAsync(cancellationToken);
        _db.ProductosModificador.RemoveRange(actuales);
        AgregarGrupos(id, validado.Grupos);
        await _db.SaveChangesAsync(cancellationToken);
        return Resultado<ProductoAdminDto>.Ok(await CargarProductoAsync(id, cancellationToken));
    }

    public async Task<Resultado<bool>> EliminarProductoAsync(Guid id, CancellationToken cancellationToken)
    {
        var producto = await _db.Productos.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (producto is null)
        {
            return Resultado<bool>.Fail(404, "Producto no encontrado.");
        }

        var enlaces = await _db.ProductosModificador.Where(enlace => enlace.ProductoId == id).ToListAsync(cancellationToken);
        _db.ProductosModificador.RemoveRange(enlaces);
        _db.Productos.Remove(producto);
        await _db.SaveChangesAsync(cancellationToken);
        return Resultado<bool>.Ok(true);
    }

    public async Task<List<UsuarioSucursalDto>> ListarUsuariosAsync(CancellationToken cancellationToken)
    {
        return await _db.Usuarios
            .AsNoTracking()
            .Where(u => u.Activo && (u.Rol == RolUsuario.Cajero || u.Rol == RolUsuario.Mesero))
            .OrderBy(u => u.Nombre)
            .Select(u => new UsuarioSucursalDto
            {
                Id = u.Id,
                Nombre = u.Nombre,
                Username = u.Username,
                Rol = u.Rol.ToString(),
                Activo = u.Activo
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<Resultado<UsuarioSucursalDto>> CrearUsuarioAsync(
        CrearUsuarioSucursalRequest request,
        CancellationToken cancellationToken)
    {
        var nombre = request.Nombre.Trim();
        var username = request.Username.Trim().ToLowerInvariant();
        if (nombre.Length == 0 || username.Length < 3 || string.IsNullOrWhiteSpace(request.Password))
        {
            return Resultado<UsuarioSucursalDto>.Fail(400, "Completa el nombre, el usuario y la contraseña.");
        }

        if (request.Password.Length < 6)
        {
            return Resultado<UsuarioSucursalDto>.Fail(400, "La contraseña debe tener al menos 6 caracteres.");
        }

        if (request.Rol is not (RolUsuario.Cajero or RolUsuario.Mesero))
        {
            return Resultado<UsuarioSucursalDto>.Fail(400, "Solo puedes crear cajeros o meseros.");
        }

        if (await _db.Usuarios.IgnoreQueryFilters().AnyAsync(u => u.Username == username, cancellationToken))
        {
            return Resultado<UsuarioSucursalDto>.Fail(409, "Ese usuario ya está registrado.");
        }

        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            Nombre = nombre,
            Username = username,
            PasswordHash = _hasher.Hash(request.Password),
            Rol = request.Rol,
            Activo = true
        };
        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync(cancellationToken);
        return Resultado<UsuarioSucursalDto>.Ok(new UsuarioSucursalDto
        {
            Id = usuario.Id,
            Nombre = usuario.Nombre,
            Username = usuario.Username,
            Rol = usuario.Rol.ToString(),
            Activo = usuario.Activo
        });
    }

    private async Task<ProductoAdminDto> CargarProductoAsync(Guid id, CancellationToken cancellationToken)
    {
        var producto = await _db.Productos
            .AsNoTracking()
            .Include(p => p.Categoria)
            .Include(p => p.Grupos)
                .ThenInclude(enlace => enlace.GrupoModificador)
            .FirstAsync(p => p.Id == id, cancellationToken);
        return Mapear(producto);
    }

    private async Task<(string Nombre, string? Descripcion, string? Foto, List<Guid> Grupos, string? Error, int Status)> ValidarProductoAsync(
        GuardarProductoRequest request,
        CancellationToken cancellationToken)
    {
        var nombre = request.Nombre.Trim();
        if (nombre.Length == 0 || request.CategoriaId == Guid.Empty)
        {
            return ("", null, null, [], "El nombre y la categoría son obligatorios.", 400);
        }

        if (request.PrecioBase < 0)
        {
            return ("", null, null, [], "El precio no puede ser negativo.", 400);
        }

        var categoriaExiste = await _db.Categorias.AnyAsync(c => c.Id == request.CategoriaId, cancellationToken);
        if (!categoriaExiste)
        {
            return ("", null, null, [], "La categoría no pertenece a esta sucursal.", 400);
        }

        var grupos = (request.GruposModificadorIds ?? []).Where(id => id != Guid.Empty).Distinct().ToList();
        if (grupos.Count > 0)
        {
            var encontrados = await _db.GruposModificador.CountAsync(g => grupos.Contains(g.Id), cancellationToken);
            if (encontrados != grupos.Count)
            {
                return ("", null, null, [], "Hay modificadores que no pertenecen a esta sucursal.", 400);
            }
        }

        var foto = Limpiar(request.FotoUrl);
        if (!FotoValida(foto))
        {
            return ("", null, null, [], "La foto debe ser una imagen PNG, JPG o WebP de menos de 300 KB.", 400);
        }

        return (nombre, Limpiar(request.Descripcion), foto, grupos, null, 200);
    }

    private void AgregarGrupos(Guid productoId, List<Guid> grupos)
    {
        foreach (var grupoId in grupos)
        {
            _db.ProductosModificador.Add(new ProductoModificador
            {
                Id = Guid.NewGuid(),
                ProductoId = productoId,
                GrupoModificadorId = grupoId
            });
        }
    }

    private static ProductoAdminDto Mapear(Producto producto) => new()
    {
        Id = producto.Id,
        CategoriaId = producto.CategoriaId,
        CategoriaNombre = producto.Categoria.Nombre,
        Nombre = producto.Nombre,
        Descripcion = producto.Descripcion,
        PrecioBase = producto.PrecioBase,
        FotoUrl = producto.FotoUrl,
        Disponible = producto.Disponible,
        Grupos = producto.Grupos
            .Select(enlace => new GrupoAsignadoDto
            {
                Id = enlace.GrupoModificadorId,
                Nombre = enlace.GrupoModificador.Nombre
            })
            .OrderBy(grupo => grupo.Nombre)
            .ToList()
    };

    public async Task<Resultado<ReporteDto>> ReporteAsync(string? periodo, CancellationToken cancellationToken)
    {
        var clave = (periodo ?? "semana").Trim().ToLowerInvariant();
        if (clave is not ("dia" or "semana" or "mes"))
        {
            return Resultado<ReporteDto>.Fail(400, "El periodo debe ser día, semana o mes.");
        }

        var (inicio, fin) = Rango(clave);
        var movimientos = await _db.Ventas
            .AsNoTracking()
            .Where(v => v.FechaHora >= inicio && v.FechaHora < fin)
            .OrderByDescending(v => v.FechaHora)
            .Select(v => new VentaResumenDto
            {
                Id = v.Id,
                FolioVenta = v.FolioVenta,
                FechaHora = v.FechaHora,
                Total = v.Total,
                MetodoPago = v.MetodoPago.ToString(),
                Cajero = v.Usuario.Nombre,
                Cancelada = v.Cancelada,
                MotivoCancelacion = v.MotivoCancelacion,
                FechaCancelacion = v.FechaCancelacion
            })
            .ToListAsync(cancellationToken);

        var detalles = await _db.VentaDetalles
            .AsNoTracking()
            .Where(d => !d.Venta.Cancelada && d.Venta.FechaHora >= inicio && d.Venta.FechaHora < fin)
            .Select(d => new { d.NombreProducto, d.Cantidad, d.TotalLinea })
            .ToListAsync(cancellationToken);

        var productos = detalles
            .GroupBy(d => d.NombreProducto)
            .Select(grupo => new ProductoReporteDto
            {
                Nombre = grupo.Key,
                Cantidad = grupo.Sum(d => d.Cantidad),
                Total = grupo.Sum(d => d.TotalLinea)
            })
            .OrderByDescending(p => p.Cantidad)
            .ThenBy(p => p.Nombre)
            .Take(8)
            .ToList();

        decimal ventas = 0, efectivo = 0, tarjeta = 0, transferencia = 0;
        var ordenes = 0;
        foreach (var venta in movimientos.Where(v => !v.Cancelada))
        {
            ordenes++;
            ventas += venta.Total;
            switch (venta.MetodoPago)
            {
                case nameof(MetodoPago.Efectivo):
                    efectivo += venta.Total;
                    break;
                case nameof(MetodoPago.Tarjeta):
                    tarjeta += venta.Total;
                    break;
                case nameof(MetodoPago.Transferencia):
                    transferencia += venta.Total;
                    break;
            }
        }

        return Resultado<ReporteDto>.Ok(new ReporteDto
        {
            Periodo = clave,
            Desde = inicio,
            Hasta = fin,
            Ventas = ventas,
            Ordenes = ordenes,
            TicketPromedio = ordenes == 0 ? 0 : decimal.Round(ventas / ordenes, 2),
            Efectivo = efectivo,
            Tarjeta = tarjeta,
            Transferencia = transferencia,
            Productos = productos,
            Movimientos = movimientos
        });
    }

    public async Task<Resultado<VentaResumenDto>> CancelarVentaAsync(Guid id, CancelarVentaRequest request, CancellationToken cancellationToken)
    {
        var motivo = request.Motivo?.Trim() ?? string.Empty;
        if (motivo.Length < 3 || motivo.Length > 200)
        {
            return Resultado<VentaResumenDto>.Fail(400, "Escribe el motivo de la anulación, de 3 a 200 caracteres.");
        }

        var venta = await _db.Ventas.FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
        if (venta is null)
        {
            return Resultado<VentaResumenDto>.Fail(404, "Venta no encontrada.");
        }

        if (venta.Cancelada)
        {
            return Resultado<VentaResumenDto>.Fail(400, "Esa venta ya está anulada.");
        }

        venta.Cancelada = true;
        venta.MotivoCancelacion = motivo;
        venta.FechaCancelacion = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        if (venta.TurnoCajaId is Guid turnoId)
        {
            await _caja.RefrescarCortesAsync([turnoId], cancellationToken);
        }

        var cajero = await _db.Usuarios
            .AsNoTracking()
            .Where(u => u.Id == venta.UsuarioId)
            .Select(u => u.Nombre)
            .FirstOrDefaultAsync(cancellationToken) ?? "Cajero";

        return Resultado<VentaResumenDto>.Ok(new VentaResumenDto
        {
            Id = venta.Id,
            FolioVenta = venta.FolioVenta,
            FechaHora = venta.FechaHora,
            Total = venta.Total,
            MetodoPago = venta.MetodoPago.ToString(),
            Cajero = cajero,
            Cancelada = true,
            MotivoCancelacion = venta.MotivoCancelacion,
            FechaCancelacion = venta.FechaCancelacion
        });
    }

    public async Task<Resultado<TicketSucursalDto>> TicketAsync(CancellationToken cancellationToken)
    {
        var ticket = await _db.Tenants
            .AsNoTracking()
            .Where(t => t.Id == _tenant.TenantId)
            .Select(t => new TicketSucursalDto
            {
                Direccion = t.Direccion,
                Telefono = t.Telefono,
                MensajeTicket = t.MensajeTicket,
                TasaImpuesto = t.TasaImpuesto
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (ticket is null)
        {
            return Resultado<TicketSucursalDto>.Fail(404, "Sucursal no encontrada.");
        }

        return Resultado<TicketSucursalDto>.Ok(ticket);
    }

    public async Task<Resultado<TicketSucursalDto>> GuardarTicketAsync(TicketSucursalDto request, CancellationToken cancellationToken)
    {
        if (request.TasaImpuesto < 0 || request.TasaImpuesto > 1)
        {
            return Resultado<TicketSucursalDto>.Fail(400, "El impuesto debe estar entre 0 y 100 por ciento.");
        }

        var sucursal = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == _tenant.TenantId, cancellationToken);
        if (sucursal is null)
        {
            return Resultado<TicketSucursalDto>.Fail(404, "Sucursal no encontrada.");
        }

        var direccion = Limpiar(request.Direccion);
        var telefono = Limpiar(request.Telefono);
        var mensaje = Limpiar(request.MensajeTicket);
        if (direccion is { Length: > 200 } || mensaje is { Length: > 200 })
        {
            return Resultado<TicketSucursalDto>.Fail(400, "La dirección y el mensaje admiten hasta 200 caracteres.");
        }

        if (telefono is { Length: > 30 })
        {
            return Resultado<TicketSucursalDto>.Fail(400, "El teléfono admite hasta 30 caracteres.");
        }

        sucursal.Direccion = direccion;
        sucursal.Telefono = telefono;
        sucursal.MensajeTicket = mensaje;
        sucursal.TasaImpuesto = decimal.Round(request.TasaImpuesto, 4);
        await _db.SaveChangesAsync(cancellationToken);
        return Resultado<TicketSucursalDto>.Ok(new TicketSucursalDto
        {
            Direccion = sucursal.Direccion,
            Telefono = sucursal.Telefono,
            MensajeTicket = sucursal.MensajeTicket,
            TasaImpuesto = sucursal.TasaImpuesto
        });
    }

    private static bool FotoValida(string? foto)
    {
        if (foto is null)
        {
            return true;
        }

        var esUrl = foto.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
            || foto.StartsWith("http://", StringComparison.OrdinalIgnoreCase);
        var esImagen = foto.StartsWith("data:image/png;base64,", StringComparison.OrdinalIgnoreCase)
            || foto.StartsWith("data:image/jpeg;base64,", StringComparison.OrdinalIgnoreCase)
            || foto.StartsWith("data:image/webp;base64,", StringComparison.OrdinalIgnoreCase);
        return foto.Length <= 400_000 && ((esUrl && foto.Length <= 500) || esImagen);
    }

    private static string? Limpiar(string? valor)
    {
        var texto = valor?.Trim();
        return string.IsNullOrEmpty(texto) ? null : texto;
    }

    private static (DateTime InicioUtc, DateTime FinUtc) DiaActualUtc()
    {
        var zona = Zona();
        var ahoraLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zona);
        return RangoLocal(ahoraLocal.Date, ahoraLocal.Date.AddDays(1), zona);
    }

    private static (DateTime InicioUtc, DateTime FinUtc) Rango(string periodo)
    {
        var zona = Zona();
        var hoy = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zona).Date;
        var inicio = periodo switch
        {
            "dia" => hoy,
            "mes" => new DateTime(hoy.Year, hoy.Month, 1),
            _ => hoy.AddDays(-(((int)hoy.DayOfWeek + 6) % 7))
        };
        return RangoLocal(inicio, hoy.AddDays(1), zona);
    }

    private static (DateTime InicioUtc, DateTime FinUtc) RangoLocal(DateTime inicioLocal, DateTime finLocal, TimeZoneInfo zona)
    {
        var inicio = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(inicioLocal, DateTimeKind.Unspecified), zona);
        var fin = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(finLocal, DateTimeKind.Unspecified), zona);
        return (DateTime.SpecifyKind(inicio, DateTimeKind.Utc), DateTime.SpecifyKind(fin, DateTimeKind.Utc));
    }

    private static TimeZoneInfo Zona()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("America/Mexico_City");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.Utc;
        }
    }
}
