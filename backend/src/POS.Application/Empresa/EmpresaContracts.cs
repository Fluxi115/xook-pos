namespace POS.Application.Empresas;

public sealed class EmpresaPanelDto
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public List<SucursalEmpresaDto> Sucursales { get; set; } = [];
}

public sealed class SucursalEmpresaDto
{
    public Guid Id { get; set; }

    public string NombreComercial { get; set; } = string.Empty;

    public string Codigo { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public Guid? ParentSucursalId { get; set; }

    public string? ParentNombre { get; set; }

    public DateTime FechaVencimiento { get; set; }
}

public sealed class CrearSucursalEmpresaRequest
{
    public string NombreComercial { get; set; } = string.Empty;

    public string Codigo { get; set; } = string.Empty;

    public Guid? ParentSucursalId { get; set; }

    public string? Telefono { get; set; }
}

public sealed class CrearGerenteRequest
{
    public string Nombre { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
}

public sealed class UsuarioCreadoDto
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string Rol { get; set; } = string.Empty;

    public Guid SucursalId { get; set; }
}
