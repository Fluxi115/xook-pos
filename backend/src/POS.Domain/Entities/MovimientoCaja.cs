using POS.Domain.Common;
using POS.Domain.Enums;

namespace POS.Domain.Entities;

public class MovimientoCaja : TenantEntity
{
    public Guid TurnoCajaId { get; set; }

    public TipoMovimientoCaja Tipo { get; set; }

    public decimal Monto { get; set; }

    public string Motivo { get; set; } = string.Empty;

    public DateTime FechaHora { get; set; }

    public TurnoCaja Turno { get; set; } = null!;
}
