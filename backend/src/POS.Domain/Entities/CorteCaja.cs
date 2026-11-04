using POS.Domain.Common;

namespace POS.Domain.Entities;

public class CorteCaja : TenantEntity
{
    public Guid TurnoCajaId { get; set; }

    public Guid UsuarioId { get; set; }

    public DateTime FechaCorte { get; set; }

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

    public TurnoCaja Turno { get; set; } = null!;

    public Usuario Usuario { get; set; } = null!;
}
