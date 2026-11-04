using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;
using POS.Application.Caja;
using POS.Domain.Entities;
using POS.Domain.Enums;

namespace POS.Application.Ventas;

public sealed class VentaSyncService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly ITenantProvider _tenant;
    private readonly CajaTurnoService _caja;

    public VentaSyncService(IAppDbContext db, ICurrentUser currentUser, ITenantProvider tenant, CajaTurnoService caja)
    {
        _db = db;
        _currentUser = currentUser;
        _tenant = tenant;
        _caja = caja;
    }

    public async Task<SyncVentasResponse> SincronizarAsync(SyncVentasRequest request, CancellationToken cancellationToken)
    {
        if (_currentUser.UsuarioId == Guid.Empty || _tenant.TenantId == Guid.Empty)
        {
            throw new InvalidOperationException("La sesión no incluye usuario y sucursal.");
        }

        var respuesta = new SyncVentasResponse();
        var ventas = request.Ventas ?? [];
        if (ventas.Count == 0)
        {
            return respuesta;
        }

        var ids = ventas.Select(v => v.Id).Where(id => id != Guid.Empty).Distinct().ToList();
        var folios = ventas
            .Select(v => v.FolioVenta.Trim())
            .Where(folio => folio.Length > 0)
            .Distinct()
            .ToList();
        var turnoIds = ventas.Select(v => v.TurnoCajaId).Where(id => id != Guid.Empty).Distinct().ToList();
        var productoIds = ventas
            .SelectMany(v => v.Items ?? [])
            .Select(item => item.ProductoId)
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();

        var idsExistentes = (await _db.Ventas
            .Where(v => ids.Contains(v.Id))
            .Select(v => v.Id)
            .ToListAsync(cancellationToken)).ToHashSet();

        var foliosExistentes = (await _db.Ventas
            .Where(v => folios.Contains(v.FolioVenta))
            .Select(v => v.FolioVenta)
            .ToListAsync(cancellationToken)).ToHashSet(StringComparer.OrdinalIgnoreCase);

        var turnos = await _db.TurnosCaja
            .Where(t => turnoIds.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, cancellationToken);

        var catalogo = await _db.Productos
            .AsNoTracking()
            .Include(p => p.Grupos)
                .ThenInclude(enlace => enlace.GrupoModificador)
                    .ThenInclude(grupo => grupo.Opciones)
            .Where(p => productoIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        var foliosDelLote = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var nuevas = new List<Venta>();

        foreach (var dto in ventas)
        {
            respuesta.Recibidas++;
            var folio = dto.FolioVenta.Trim();

            if (dto.Id != Guid.Empty && idsExistentes.Contains(dto.Id))
            {
                respuesta.Omitidas++;
                respuesta.IdsSincronizados.Add(dto.Id);
                continue;
            }

            var error = Validar(dto, folio);
            if (error is null)
            {
                error = ValidarContexto(dto, turnos);
            }

            List<LineaCalculada>? lineas = null;
            if (error is null)
            {
                (lineas, error) = CalcularLineas(dto, catalogo);
            }

            if (error is null && (foliosExistentes.Contains(folio) || !foliosDelLote.Add(folio)))
            {
                error = "El folio ya existe en la sucursal.";
            }

            if (error is not null || lineas is null)
            {
                respuesta.Errores.Add(new SyncVentaError
                {
                    Id = dto.Id,
                    Mensaje = error ?? "La venta no es válida.",
                    Definitivo = true
                });
                continue;
            }

            nuevas.Add(Mapear(dto, folio, lineas));
            idsExistentes.Add(dto.Id);
        }

        if (nuevas.Count > 0)
        {
            _db.Ventas.AddRange(nuevas);
            await _db.SaveChangesAsync(cancellationToken);
            respuesta.Insertadas = nuevas.Count;
            respuesta.IdsSincronizados.AddRange(nuevas.Select(v => v.Id));
            var turnosAfectados = nuevas
                .Where(v => v.TurnoCajaId.HasValue)
                .Select(v => v.TurnoCajaId!.Value)
                .Distinct()
                .ToList();
            await _caja.RefrescarCortesAsync(turnosAfectados, cancellationToken);
        }

        return respuesta;
    }

    private string? ValidarContexto(VentaSyncDto dto, Dictionary<Guid, TurnoCaja> turnos)
    {
        if (dto.TenantId != _tenant.TenantId)
        {
            return "La venta pertenece a otra sucursal.";
        }

        if (dto.UsuarioId != _currentUser.UsuarioId)
        {
            return "La venta pertenece a otro usuario.";
        }

        if (!turnos.TryGetValue(dto.TurnoCajaId, out var turno) || turno.UsuarioId != _currentUser.UsuarioId)
        {
            return "El turno no pertenece a este usuario.";
        }

        return null;
    }

    private static string? Validar(VentaSyncDto dto, string folio)
    {
        if (dto.Id == Guid.Empty)
        {
            return "La venta necesita un identificador generado en el cliente.";
        }

        if (dto.TenantId == Guid.Empty || dto.UsuarioId == Guid.Empty || dto.TurnoCajaId == Guid.Empty)
        {
            return "La venta no trae sucursal, usuario o turno.";
        }

        if (folio.Length == 0 || folio.Length > 40)
        {
            return "El folio es obligatorio y debe tener hasta 40 caracteres.";
        }

        if (dto.FechaHora == default)
        {
            return "La fecha de la venta es obligatoria.";
        }

        if (!Enum.IsDefined(dto.MetodoPago))
        {
            return "El método de pago no es válido.";
        }

        if (dto.Subtotal < 0 || dto.Total < 0)
        {
            return "Los importes no pueden ser negativos.";
        }

        if (dto.Items is null || dto.Items.Count == 0)
        {
            return "La venta no tiene partidas.";
        }

        foreach (var item in dto.Items)
        {
            if (item.ProductoId == Guid.Empty || string.IsNullOrWhiteSpace(item.NombreProducto))
            {
                return "Cada partida necesita producto y nombre.";
            }

            if (item.Cantidad is < 1 or > 999)
            {
                return "La cantidad de cada partida debe estar entre 1 y 999.";
            }

            if (item.PrecioCatalogo < 0 || item.PrecioUnitario < 0 || item.TotalLinea < 0)
            {
                return "Los importes de la partida no pueden ser negativos.";
            }
        }

        return null;
    }

    private static (List<LineaCalculada>? Lineas, string? Error) CalcularLineas(
        VentaSyncDto dto,
        Dictionary<Guid, Producto> catalogo)
    {
        var lineas = new List<LineaCalculada>();
        decimal subtotal = 0;

        foreach (var item in dto.Items)
        {
            if (!catalogo.TryGetValue(item.ProductoId, out var producto))
            {
                return (null, $"El producto {item.NombreProducto.Trim()} no está en el catálogo de la sucursal.");
            }

            if (!Casi(item.PrecioCatalogo, producto.PrecioBase))
            {
                return (null, $"El precio de {producto.Nombre} no coincide con el catálogo.");
            }

            var opciones = producto.Grupos
                .Select(enlace => enlace.GrupoModificador)
                .Where(grupo => grupo is not null)
                .SelectMany(grupo => grupo.Opciones)
                .ToList();

            decimal extras = 0;
            foreach (var extra in item.Modificadores ?? [])
            {
                var opcion = opciones.FirstOrDefault(o => o.Id == extra.OpcionId);
                if (opcion is null)
                {
                    return (null, $"Un complemento de {producto.Nombre} no pertenece al producto.");
                }

                if (!Casi(extra.PrecioAdicional, opcion.PrecioAdicional))
                {
                    return (null, $"El precio de {opcion.Nombre} no coincide con el catálogo.");
                }

                extras += opcion.PrecioAdicional;
            }

            var unitario = Redondear(producto.PrecioBase + extras);
            var totalLinea = Redondear(unitario * item.Cantidad);
            if (!Casi(item.PrecioUnitario, unitario) || !Casi(item.TotalLinea, totalLinea))
            {
                return (null, $"El importe de {producto.Nombre} no cuadra con el catálogo.");
            }

            lineas.Add(new LineaCalculada(item, unitario, totalLinea));
            subtotal += totalLinea;
        }

        subtotal = Redondear(subtotal);
        if (!Casi(dto.Subtotal, subtotal) || !Casi(dto.Total, subtotal))
        {
            return (null, "El total de la venta no cuadra con el catálogo.");
        }

        return (lineas, null);
    }

    private Venta Mapear(VentaSyncDto dto, string folio, List<LineaCalculada> lineas)
    {
        var fecha = dto.FechaHora.Kind == DateTimeKind.Utc
            ? dto.FechaHora
            : dto.FechaHora.ToUniversalTime();
        var subtotal = Redondear(lineas.Sum(linea => linea.TotalLinea));

        return new Venta
        {
            Id = dto.Id,
            UsuarioId = _currentUser.UsuarioId,
            TurnoCajaId = dto.TurnoCajaId,
            FolioVenta = folio,
            FechaHora = fecha,
            Subtotal = subtotal,
            Total = subtotal,
            MetodoPago = dto.MetodoPago,
            EstadoSincronizacion = EstadoSincronizacion.Sincronizado,
            Detalles = lineas.Select(linea => new VentaDetalle
            {
                Id = Guid.NewGuid(),
                VentaId = dto.Id,
                ProductoId = linea.Item.ProductoId,
                NombreProducto = linea.Item.NombreProducto.Trim(),
                Cantidad = linea.Item.Cantidad,
                PrecioUnitario = linea.Unitario,
                TotalLinea = linea.TotalLinea,
                ModificadoresJson = JsonSerializer.Serialize(linea.Item.Modificadores ?? [], JsonOptions)
            }).ToList()
        };
    }

    private static decimal Redondear(decimal valor) => Math.Round(valor, 2, MidpointRounding.AwayFromZero);

    private static bool Casi(decimal izquierda, decimal derecha) => Math.Abs(izquierda - derecha) <= 0.001m;

    private sealed record LineaCalculada(VentaItemSyncDto Item, decimal Unitario, decimal TotalLinea);
}
