using POS.Domain.Enums;

namespace POS.Application.Caja;

public sealed class AbrirTurnoRequest
{
    public decimal FondoInicial { get; set; }
}

public sealed class MovimientoCajaRequest
{
    public TipoMovimientoCaja Tipo { get; set; }

    public decimal Monto { get; set; }

    public string Motivo { get; set; } = string.Empty;
}

public sealed class CerrarTurnoRequest
{
    public decimal EfectivoContado { get; set; }

    public string? Observaciones { get; set; }
}

public sealed class MovimientoCajaDto
{
    public Guid Id { get; set; }

    public string Tipo { get; set; } = string.Empty;

    public decimal Monto { get; set; }

    public string Motivo { get; set; } = string.Empty;

    public DateTime FechaHora { get; set; }
}

public sealed class TurnoActivoDto
{
    public Guid Id { get; set; }

    public DateTime FechaApertura { get; set; }

    public decimal FondoInicial { get; set; }

    public string Estado { get; set; } = string.Empty;

    public string Cajero { get; set; } = string.Empty;

    public int Ordenes { get; set; }

    public decimal VentasEfectivo { get; set; }

    public decimal VentasTarjeta { get; set; }

    public decimal VentasTransferencia { get; set; }

    public decimal VentasMixto { get; set; }

    public decimal TotalEntradas { get; set; }

    public decimal TotalSalidas { get; set; }

    public decimal EfectivoEsperado { get; set; }

    public List<MovimientoCajaDto> Movimientos { get; set; } = [];
}

public sealed class CorteCajaDto
{
    public Guid Id { get; set; }

    public Guid TurnoCajaId { get; set; }

    public DateTime FechaCorte { get; set; }

    public string Cajero { get; set; } = string.Empty;

    public int Ordenes { get; set; }

    public decimal TotalVentasEfectivo { get; set; }

    public decimal TotalVentasTarjeta { get; set; }

    public decimal TotalVentasTransferencia { get; set; }

    public decimal TotalVentasMixto { get; set; }

    public decimal FondoInicial { get; set; }

    public decimal TotalEntradas { get; set; }

    public decimal TotalSalidas { get; set; }

    public decimal EfectivoEsperado { get; set; }

    public decimal EfectivoContado { get; set; }

    public decimal Diferencia { get; set; }

    public string? Observaciones { get; set; }
}
