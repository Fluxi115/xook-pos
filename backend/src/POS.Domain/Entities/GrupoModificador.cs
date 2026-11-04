using POS.Domain.Common;

namespace POS.Domain.Entities;

public class GrupoModificador : TenantEntity
{
    public string Nombre { get; set; } = string.Empty;

    public bool EsObligatorio { get; set; }

    public int SeleccionMaxima { get; set; }

    public ICollection<OpcionModificador> Opciones { get; set; } = new List<OpcionModificador>();

    public ICollection<ProductoModificador> Productos { get; set; } = new List<ProductoModificador>();
}
