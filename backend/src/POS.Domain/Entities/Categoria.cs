using POS.Domain.Common;

namespace POS.Domain.Entities;

public class Categoria : TenantEntity
{
    public string Nombre { get; set; } = string.Empty;

    public int Orden { get; set; }

    public string? IconoUrl { get; set; }

    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
}
