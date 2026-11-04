using POS.Domain.Enums;

namespace POS.Application.SuperAdmin;

public sealed class CrearTenantRequest
{
    public string NombreComercial { get; set; } = string.Empty;

    public string RucRfc { get; set; } = string.Empty;

    public string? Telefono { get; set; }

    public string? LogoUrl { get; set; }

    public DateTime FechaVencimiento { get; set; }

    public string AdminNombre { get; set; } = string.Empty;

    public string AdminUsername { get; set; } = string.Empty;

    public string AdminPassword { get; set; } = string.Empty;
}

public sealed class ActualizarTenantRequest
{
    public string NombreComercial { get; set; } = string.Empty;

    public string RucRfc { get; set; } = string.Empty;

    public string? Telefono { get; set; }

    public string? LogoUrl { get; set; }
}

public sealed class ActualizarSuscripcionRequest
{
    public DateTime FechaVencimiento { get; set; }

    public EstadoTenant Estado { get; set; }
}

public sealed class TenantAdminDto
{
    public Guid Id { get; set; }

    public string NombreComercial { get; set; } = string.Empty;

    public string RucRfc { get; set; } = string.Empty;

    public string? Telefono { get; set; }

    public string? LogoUrl { get; set; }

    public string Estado { get; set; } = string.Empty;

    public DateTime FechaVencimiento { get; set; }

    public int TotalUsuarios { get; set; }
}

public sealed class OperacionTenant
{
    public bool Exitoso { get; private init; }

    public int StatusCode { get; private init; }

    public string? Mensaje { get; private init; }

    public TenantAdminDto? Tenant { get; private init; }

    public static OperacionTenant Ok(TenantAdminDto tenant) =>
        new() { Exitoso = true, StatusCode = 200, Tenant = tenant };

    public static OperacionTenant Fail(int statusCode, string mensaje) =>
        new() { Exitoso = false, StatusCode = statusCode, Mensaje = mensaje };
}
