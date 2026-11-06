using POS.Domain.Common;
using POS.Domain.Enums;

namespace POS.Domain.Entities;

public class PagoSuscripcion : IMustHaveTenant
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public decimal Monto { get; set; }

    public MedioCobro Medio { get; set; }

    public DateTime FechaPago { get; set; }

    public int Meses { get; set; }

    public DateTime VigenciaHasta { get; set; }

    public string? Nota { get; set; }

    public Tenant Tenant { get; set; } = null!;
}
