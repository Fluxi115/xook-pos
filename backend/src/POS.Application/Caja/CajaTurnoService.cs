using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;
using POS.Application.TenantAdmin;
using POS.Domain.Entities;
using POS.Domain.Enums;

namespace POS.Application.Caja;

public sealed class CajaTurnoService
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _usuario;

    public CajaTurnoService(IAppDbContext db, ICurrentUser usuario)
    {
        _db = db;
        _usuario = usuario;
    }

    public async Task<Resultado<TurnoActivoDto>> AbrirAsync(AbrirTurnoRequest request, CancellationToken cancellationToken)
    {
        if (_usuario.UsuarioId == Guid.Empty)
        {
            return Resultado<TurnoActivoDto>.Fail(401, "La sesión no incluye un usuario.");
        }

        if (request.FondoInicial < 0)
        {
            return Resultado<TurnoActivoDto>.Fail(400, "El fondo inicial no puede ser negativo.");
        }

        if (await TurnoAbiertoAsync(cancellationToken) is not null)
        {
            return Resultado<TurnoActivoDto>.Fail(400, "Ya tienes un turno de caja abierto.");
        }

        var turno = new TurnoCaja
        {
            Id = Guid.NewGuid(),
            UsuarioId = _usuario.UsuarioId,
            FechaApertura = DateTime.UtcNow,
            FondoInicial = request.FondoInicial,
            Estado = EstadoTurno.Abierto
        };
        _db.TurnosCaja.Add(turno);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (EsTurnoDuplicado(ex))
        {
            return Resultado<TurnoActivoDto>.Fail(400, "Ya tienes un turno de caja abierto.");
        }

        return Resultado<TurnoActivoDto>.Ok(await ArmarAsync(turno, cancellationToken));
    }

    public async Task<Resultado<TurnoActivoDto>> ActivoAsync(CancellationToken cancellationToken)
    {
        var turno = await TurnoAbiertoAsync(cancellationToken);
        if (turno is null)
        {
            return Resultado<TurnoActivoDto>.Fail(404, "No hay un turno de caja abierto.");
        }

        return Resultado<TurnoActivoDto>.Ok(await ArmarAsync(turno, cancellationToken));
    }

    public async Task<Resultado<TurnoActivoDto>> RegistrarMovimientoAsync(
        MovimientoCajaRequest request,
        CancellationToken cancellationToken)
    {
        var turno = await TurnoAbiertoAsync(cancellationToken);
        if (turno is null)
        {
            return Resultado<TurnoActivoDto>.Fail(404, "No hay un turno de caja abierto.");
        }

        var motivo = request.Motivo.Trim();
        if (motivo.Length == 0 || request.Monto <= 0 || !Enum.IsDefined(request.Tipo))
        {
            return Resultado<TurnoActivoDto>.Fail(400, "Indica el tipo, un monto mayor a cero y el motivo.");
        }

        _db.MovimientosCaja.Add(new MovimientoCaja
        {
            Id = Guid.NewGuid(),
            TurnoCajaId = turno.Id,
            Tipo = request.Tipo,
            Monto = request.Monto,
            Motivo = motivo,
            FechaHora = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);
        return Resultado<TurnoActivoDto>.Ok(await ArmarAsync(turno, cancellationToken));
    }

    public async Task<Resultado<CorteCajaDto>> CerrarAsync(CerrarTurnoRequest request, CancellationToken cancellationToken)
    {
        if (request.EfectivoContado < 0)
        {
            return Resultado<CorteCajaDto>.Fail(400, "El efectivo contado no puede ser negativo.");
        }

        var turno = await _db.TurnosCaja
            .OrderBy(t => t.FechaApertura)
            .FirstOrDefaultAsync(t => t.UsuarioId == _usuario.UsuarioId && t.Estado == EstadoTurno.Abierto, cancellationToken);
        if (turno is null)
        {
            return Resultado<CorteCajaDto>.Fail(404, "No hay un turno de caja abierto.");
        }

        var cierre = DateTime.UtcNow;
        var resumen = await CalcularAsync(turno, cancellationToken);
        var diferencia = request.EfectivoContado - resumen.EfectivoEsperado;
        var corte = new CorteCaja
        {
            Id = Guid.NewGuid(),
            TurnoCajaId = turno.Id,
            UsuarioId = _usuario.UsuarioId,
            FechaCorte = cierre,
            TotalVentasEfectivo = resumen.Efectivo,
            TotalVentasTarjeta = resumen.Tarjeta,
            TotalVentasTransferencia = resumen.Transferencia,
            TotalVentasMixto = resumen.Mixto,
            FondoInicial = turno.FondoInicial,
            TotalEntradas = resumen.Entradas,
            TotalSalidas = resumen.Salidas,
            EfectivoEsperado = resumen.EfectivoEsperado,
            EfectivoContado = request.EfectivoContado,
            Diferencia = diferencia,
            Observaciones = Limpiar(request.Observaciones)
        };

        turno.Estado = EstadoTurno.Cerrado;
        turno.FechaCierre = cierre;
        _db.CortesCaja.Add(corte);
        await _db.SaveChangesAsync(cancellationToken);

        return Resultado<CorteCajaDto>.Ok(new CorteCajaDto
        {
            Id = corte.Id,
            TurnoCajaId = corte.TurnoCajaId,
            FechaCorte = corte.FechaCorte,
            Cajero = resumen.Cajero,
            Ordenes = resumen.Ordenes,
            TotalVentasEfectivo = corte.TotalVentasEfectivo,
            TotalVentasTarjeta = corte.TotalVentasTarjeta,
            TotalVentasTransferencia = corte.TotalVentasTransferencia,
            TotalVentasMixto = corte.TotalVentasMixto,
            FondoInicial = corte.FondoInicial,
            TotalEntradas = corte.TotalEntradas,
            TotalSalidas = corte.TotalSalidas,
            EfectivoEsperado = corte.EfectivoEsperado,
            EfectivoContado = corte.EfectivoContado,
            Diferencia = corte.Diferencia,
            Observaciones = corte.Observaciones
        });
    }

    public async Task<List<CorteCajaDto>> ListarCortesAsync(CancellationToken cancellationToken)
    {
        return await _db.CortesCaja
            .AsNoTracking()
            .OrderByDescending(c => c.FechaCorte)
            .Select(c => new CorteCajaDto
            {
                Id = c.Id,
                TurnoCajaId = c.TurnoCajaId,
                FechaCorte = c.FechaCorte,
                Cajero = c.Usuario.Nombre,
                TotalVentasEfectivo = c.TotalVentasEfectivo,
                TotalVentasTarjeta = c.TotalVentasTarjeta,
                TotalVentasTransferencia = c.TotalVentasTransferencia,
                TotalVentasMixto = c.TotalVentasMixto,
                FondoInicial = c.FondoInicial,
                TotalEntradas = c.TotalEntradas,
                TotalSalidas = c.TotalSalidas,
                EfectivoEsperado = c.EfectivoEsperado,
                EfectivoContado = c.EfectivoContado,
                Diferencia = c.Diferencia,
                Observaciones = c.Observaciones
            })
            .ToListAsync(cancellationToken);
    }

    public async Task RefrescarCortesAsync(IReadOnlyCollection<Guid> turnoIds, CancellationToken cancellationToken)
    {
        if (turnoIds.Count == 0)
        {
            return;
        }

        var cortes = await _db.CortesCaja
            .Where(c => turnoIds.Contains(c.TurnoCajaId))
            .ToListAsync(cancellationToken);
        if (cortes.Count == 0)
        {
            return;
        }

        foreach (var corte in cortes)
        {
            var turno = await _db.TurnosCaja.FirstAsync(t => t.Id == corte.TurnoCajaId, cancellationToken);
            var resumen = await CalcularAsync(turno, cancellationToken);
            corte.TotalVentasEfectivo = resumen.Efectivo;
            corte.TotalVentasTarjeta = resumen.Tarjeta;
            corte.TotalVentasTransferencia = resumen.Transferencia;
            corte.TotalVentasMixto = resumen.Mixto;
            corte.TotalEntradas = resumen.Entradas;
            corte.TotalSalidas = resumen.Salidas;
            corte.EfectivoEsperado = resumen.EfectivoEsperado;
            corte.Diferencia = corte.EfectivoContado - resumen.EfectivoEsperado;
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task<TurnoCaja?> TurnoAbiertoAsync(CancellationToken cancellationToken)
    {
        return await _db.TurnosCaja
            .AsNoTracking()
            .OrderBy(t => t.FechaApertura)
            .FirstOrDefaultAsync(t => t.UsuarioId == _usuario.UsuarioId && t.Estado == EstadoTurno.Abierto, cancellationToken);
    }

    private async Task<TurnoActivoDto> ArmarAsync(TurnoCaja turno, CancellationToken cancellationToken)
    {
        var resumen = await CalcularAsync(turno, cancellationToken);
        return new TurnoActivoDto
        {
            Id = turno.Id,
            FechaApertura = turno.FechaApertura,
            FondoInicial = turno.FondoInicial,
            Estado = turno.Estado.ToString(),
            Cajero = resumen.Cajero,
            Ordenes = resumen.Ordenes,
            VentasEfectivo = resumen.Efectivo,
            VentasTarjeta = resumen.Tarjeta,
            VentasTransferencia = resumen.Transferencia,
            VentasMixto = resumen.Mixto,
            TotalEntradas = resumen.Entradas,
            TotalSalidas = resumen.Salidas,
            EfectivoEsperado = resumen.EfectivoEsperado,
            Movimientos = resumen.Movimientos
        };
    }

    private async Task<Resumen> CalcularAsync(TurnoCaja turno, CancellationToken cancellationToken)
    {
        var cajero = await _db.Usuarios
            .AsNoTracking()
            .Where(u => u.Id == turno.UsuarioId)
            .Select(u => u.Nombre)
            .FirstOrDefaultAsync(cancellationToken) ?? "Cajero";

        var ventas = await _db.Ventas
            .AsNoTracking()
            .Where(v => v.TurnoCajaId == turno.Id && !v.Cancelada)
            .Select(v => new { v.Total, v.MetodoPago })
            .ToListAsync(cancellationToken);

        var movimientos = await _db.MovimientosCaja
            .AsNoTracking()
            .Where(m => m.TurnoCajaId == turno.Id)
            .OrderBy(m => m.FechaHora)
            .ToListAsync(cancellationToken);

        decimal efectivo = 0, tarjeta = 0, transferencia = 0, mixto = 0;
        foreach (var venta in ventas)
        {
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

        var entradas = movimientos.Where(m => m.Tipo == TipoMovimientoCaja.Entrada).Sum(m => m.Monto);
        var salidas = movimientos.Where(m => m.Tipo == TipoMovimientoCaja.Salida).Sum(m => m.Monto);
        return new Resumen(
            cajero,
            ventas.Count,
            efectivo,
            tarjeta,
            transferencia,
            mixto,
            entradas,
            salidas,
            turno.FondoInicial + efectivo + entradas - salidas,
            movimientos.Select(m => new MovimientoCajaDto
            {
                Id = m.Id,
                Tipo = m.Tipo.ToString(),
                Monto = m.Monto,
                Motivo = m.Motivo,
                FechaHora = m.FechaHora
            }).ToList());
    }

    private static bool EsTurnoDuplicado(DbUpdateException ex)
    {
        var texto = ex.InnerException?.Message ?? ex.Message;
        return texto.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase);
    }

    private static string? Limpiar(string? valor)
    {
        var texto = valor?.Trim();
        return string.IsNullOrEmpty(texto) ? null : texto;
    }

    private sealed record Resumen(
        string Cajero,
        int Ordenes,
        decimal Efectivo,
        decimal Tarjeta,
        decimal Transferencia,
        decimal Mixto,
        decimal Entradas,
        decimal Salidas,
        decimal EfectivoEsperado,
        List<MovimientoCajaDto> Movimientos);
}
