using POS.Domain.Common;

namespace POS.Domain.Entities;

public class VentaDetalle : TenantEntity
{
    public Guid VentaId { get; set; }

    public Guid ProductoId { get; set; }

    public string NombreProducto { get; set; } = string.Empty;

    public int Cantidad { get; set; }

    public decimal PrecioUnitario { get; set; }

    public decimal TotalLinea { get; set; }

    public string ModificadoresJson { get; set; } = "[]";

    public Venta Venta { get; set; } = null!;
}
