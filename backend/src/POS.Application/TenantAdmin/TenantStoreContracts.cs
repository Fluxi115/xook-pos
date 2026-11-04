using POS.Domain.Enums;

namespace POS.Application.TenantAdmin;

public sealed class DashboardDto
{
    public string NombreComercial { get; set; } = string.Empty;

    public decimal VentasDelDia { get; set; }

    public int OrdenesDelDia { get; set; }

    public decimal TicketPromedio { get; set; }

    public decimal Efectivo { get; set; }

    public decimal Tarjeta { get; set; }

    public decimal Transferencia { get; set; }

    public decimal Mixto { get; set; }

    public List<VentaResumenDto> UltimasVentas { get; set; } = [];
}

public sealed class VentaResumenDto
{
    public Guid Id { get; set; }

    public string FolioVenta { get; set; } = string.Empty;

    public DateTime FechaHora { get; set; }

    public decimal Total { get; set; }

    public string MetodoPago { get; set; } = string.Empty;

    public string Cajero { get; set; } = string.Empty;
}

public sealed class ProductoAdminDto
{
    public Guid Id { get; set; }

    public Guid CategoriaId { get; set; }

    public string CategoriaNombre { get; set; } = string.Empty;

    public string Nombre { get; set; } = string.Empty;

    public string? Descripcion { get; set; }

    public decimal PrecioBase { get; set; }

    public string? FotoUrl { get; set; }

    public bool Disponible { get; set; }

    public List<GrupoAsignadoDto> Grupos { get; set; } = [];
}

public sealed class GrupoAsignadoDto
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;
}

public sealed class CategoriaAdminDto
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public int Orden { get; set; }
}

public sealed class GrupoModificadorAdminDto
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public bool EsObligatorio { get; set; }

    public int SeleccionMaxima { get; set; }
}

public sealed class GuardarProductoRequest
{
    public string Nombre { get; set; } = string.Empty;

    public string? Descripcion { get; set; }

    public Guid CategoriaId { get; set; }

    public decimal PrecioBase { get; set; }

    public string? FotoUrl { get; set; }

    public bool Disponible { get; set; } = true;

    public List<Guid> GruposModificadorIds { get; set; } = [];
}

public sealed class UsuarioSucursalDto
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string Rol { get; set; } = string.Empty;

    public bool Activo { get; set; }
}

public sealed class CrearUsuarioSucursalRequest
{
    public string Nombre { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public RolUsuario Rol { get; set; }
}

public sealed class Resultado<T>
{
    public bool Exitoso { get; private init; }

    public int StatusCode { get; private init; }

    public string? Mensaje { get; private init; }

    public T? Valor { get; private init; }

    public static Resultado<T> Ok(T valor) => new() { Exitoso = true, StatusCode = 200, Valor = valor };

    public static Resultado<T> Fail(int statusCode, string mensaje) =>
        new() { Exitoso = false, StatusCode = statusCode, Mensaje = mensaje };
}
