using POS.Domain.Common;

namespace POS.Domain.Entities;

public class OpcionModificador : TenantEntity
{
    public Guid GrupoModificadorId { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public decimal PrecioAdicional { get; set; }

    public GrupoModificador GrupoModificador { get; set; } = null!;
}
