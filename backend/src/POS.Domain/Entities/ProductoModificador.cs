using POS.Domain.Common;

namespace POS.Domain.Entities;

public class ProductoModificador : TenantEntity
{
    public Guid ProductoId { get; set; }

    public Guid GrupoModificadorId { get; set; }

    public Producto Producto { get; set; } = null!;

    public GrupoModificador GrupoModificador { get; set; } = null!;
}
