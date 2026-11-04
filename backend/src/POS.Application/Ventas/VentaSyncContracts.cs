using POS.Domain.Enums;

namespace POS.Application.Ventas;

public sealed class SyncVentasRequest
{
    public List<VentaSyncDto> Ventas { get; set; } = [];
}

public sealed class VentaSyncDto
{
    public Guid Id { get; set; }

    public string FolioVenta { get; set; } = string.Empty;

    public DateTime FechaHora { get; set; }

    public decimal Subtotal { get; set; }

    public decimal Total { get; set; }

    public MetodoPago MetodoPago { get; set; }

    public Guid TenantId { get; set; }

    public Guid UsuarioId { get; set; }

    public Guid TurnoCajaId { get; set; }

    public List<VentaItemSyncDto> Items { get; set; } = [];
}

public sealed class VentaItemSyncDto
{
    public Guid ProductoId { get; set; }

    public string NombreProducto { get; set; } = string.Empty;

    public int Cantidad { get; set; }

    public decimal PrecioCatalogo { get; set; }

    public decimal PrecioUnitario { get; set; }

    public decimal TotalLinea { get; set; }

    public List<ModificadorSeleccionadoDto> Modificadores { get; set; } = [];
}

public sealed class ModificadorSeleccionadoDto
{
    public Guid OpcionId { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public decimal PrecioAdicional { get; set; }
}

public sealed class SyncVentasResponse
{
    public int Recibidas { get; set; }

    public int Insertadas { get; set; }

    public int Omitidas { get; set; }

    public List<Guid> IdsSincronizados { get; set; } = [];

    public List<SyncVentaError> Errores { get; set; } = [];
}

public sealed class SyncVentaError
{
    public Guid Id { get; set; }

    public string Mensaje { get; set; } = string.Empty;

    public bool Definitivo { get; set; } = true;
}
