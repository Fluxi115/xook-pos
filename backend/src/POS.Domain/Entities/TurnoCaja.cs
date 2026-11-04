using POS.Domain.Common;
using POS.Domain.Enums;

namespace POS.Domain.Entities;

public class TurnoCaja : TenantEntity
{
    public Guid UsuarioId { get; set; }

    public DateTime FechaApertura { get; set; }

    public DateTime? FechaCierre { get; set; }

    public decimal FondoInicial { get; set; }

    public EstadoTurno Estado { get; set; } = EstadoTurno.Abierto;

    public Usuario Usuario { get; set; } = null!;

    public ICollection<MovimientoCaja> Movimientos { get; set; } = new List<MovimientoCaja>();
}
