using POS.Domain.Common;
using POS.Domain.Enums;

namespace POS.Domain.Entities;

public class Venta : TenantEntity
{
    public Guid UsuarioId { get; set; }

    public Guid? TurnoCajaId { get; set; }

    public TurnoCaja? Turno { get; set; }

    public string FolioVenta { get; set; } = string.Empty;

    public DateTime FechaHora { get; set; }

    public decimal Subtotal { get; set; }

    public decimal Total { get; set; }

    public MetodoPago MetodoPago { get; set; }

    public EstadoSincronizacion EstadoSincronizacion { get; set; } = EstadoSincronizacion.Pendiente;

    public bool Cancelada { get; set; }

    public string? MotivoCancelacion { get; set; }

    public DateTime? FechaCancelacion { get; set; }

    public Usuario Usuario { get; set; } = null!;

    public ICollection<VentaDetalle> Detalles { get; set; } = new List<VentaDetalle>();
}
