using POS.Domain.Common;

namespace POS.Domain.Entities;

public class Producto : TenantEntity
{
    public Guid CategoriaId { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string? Descripcion { get; set; }

    public decimal PrecioBase { get; set; }

    public string? FotoUrl { get; set; }

    public bool Disponible { get; set; } = true;

    public Categoria Categoria { get; set; } = null!;

    public ICollection<ProductoModificador> Grupos { get; set; } = new List<ProductoModificador>();
}
