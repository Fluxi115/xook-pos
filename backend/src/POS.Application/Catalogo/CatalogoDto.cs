namespace POS.Application.Catalogo;

public sealed class CatalogoDto
{
    public TenantInfoDto Tenant { get; set; } = new();

    public List<CategoriaDto> Categorias { get; set; } = [];

    public List<ProductoDto> Productos { get; set; } = [];
}

public sealed class TenantInfoDto
{
    public Guid Id { get; set; }

    public string NombreComercial { get; set; } = string.Empty;

    public string RucRfc { get; set; } = string.Empty;

    public string? LogoUrl { get; set; }

    public string Estado { get; set; } = string.Empty;

    public DateTime FechaVencimiento { get; set; }
}

public sealed class CategoriaDto
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public int Orden { get; set; }

    public string? IconoUrl { get; set; }
}

public sealed class ProductoDto
{
    public Guid Id { get; set; }

    public Guid CategoriaId { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string? Descripcion { get; set; }

    public decimal PrecioBase { get; set; }

    public string? FotoUrl { get; set; }

    public bool Disponible { get; set; }

    public List<GrupoModificadorDto> Modificadores { get; set; } = [];
}

public sealed class GrupoModificadorDto
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public bool EsObligatorio { get; set; }

    public int SeleccionMaxima { get; set; }

    public List<OpcionModificadorDto> Opciones { get; set; } = [];
}

public sealed class OpcionModificadorDto
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public decimal PrecioAdicional { get; set; }
}
