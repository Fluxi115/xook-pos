namespace POS.Domain.Entities;

public class Empresa
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public DateTime FechaCreacion { get; set; }

    public ICollection<Tenant> Sucursales { get; set; } = new List<Tenant>();
}
