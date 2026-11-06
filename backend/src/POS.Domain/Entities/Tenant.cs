using POS.Domain.Enums;

namespace POS.Domain.Entities;

public class Tenant
{
    public Guid Id { get; set; }

    public string NombreComercial { get; set; } = string.Empty;

    public string RucRfc { get; set; } = string.Empty;

    public string? Telefono { get; set; }

    public string? Direccion { get; set; }

    public string? MensajeTicket { get; set; }

    public decimal TasaImpuesto { get; set; }

    public string? LogoUrl { get; set; }

    public EstadoTenant Estado { get; set; } = EstadoTenant.Activo;

    public DateTime FechaVencimiento { get; set; }

    public DateTime FechaCreacion { get; set; }
}
