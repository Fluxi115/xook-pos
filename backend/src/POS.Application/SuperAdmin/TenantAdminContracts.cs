using POS.Domain.Enums;

namespace POS.Application.SuperAdmin;

public sealed class CrearTenantRequest
{
    public string NombreComercial { get; set; } = string.Empty;

    public string RucRfc { get; set; } = string.Empty;

    public string? Telefono { get; set; }

    public string? LogoUrl { get; set; }

    public int MaxCajas { get; set; } = 1;

    public int MaxMeseros { get; set; } = 1;

    public DateTime FechaVencimiento { get; set; }

    public string Slug { get; set; } = string.Empty;

    public string Codigo { get; set; } = string.Empty;

    public string AdminNombre { get; set; } = string.Empty;

    public string AdminPassword { get; set; } = string.Empty;
}

public sealed class ActualizarTenantRequest
{
    public string NombreComercial { get; set; } = string.Empty;

    public string RucRfc { get; set; } = string.Empty;

    public string? Telefono { get; set; }

    public string? LogoUrl { get; set; }

    public int MaxCajas { get; set; } = 1;

    public int MaxMeseros { get; set; } = 1;

    public string? Codigo { get; set; }

    public string? Slug { get; set; }

    public string? EmpresaSlug { get; set; }
}

public sealed class ActualizarSuscripcionRequest
{
    public DateTime FechaVencimiento { get; set; }

    public EstadoTenant Estado { get; set; }
}

public sealed class RegistrarPagoRequest
{
    public decimal Monto { get; set; }

    public MedioCobro Medio { get; set; }

    public int Meses { get; set; }

    public string? Nota { get; set; }
}

public sealed class PagoSuscripcionDto
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public string NombreComercial { get; set; } = string.Empty;

    public decimal Monto { get; set; }

    public string Medio { get; set; } = string.Empty;

    public DateTime FechaPago { get; set; }

    public int Meses { get; set; }

    public DateTime VigenciaHasta { get; set; }

    public string? Nota { get; set; }
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

    public int MaxCajas { get; set; }

    public int MaxMeseros { get; set; }

    public int Cajas { get; set; }

    public int Meseros { get; set; }

    public Guid EmpresaId { get; set; }

    public string EmpresaNombre { get; set; } = string.Empty;

    public string EmpresaSlug { get; set; } = string.Empty;

    public string Codigo { get; set; } = string.Empty;

    public string Slug { get; set; } = string.Empty;

    public string? AdminUsername { get; set; }
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

public sealed class OperacionPago
{
    public bool Exitoso { get; private init; }

    public int StatusCode { get; private init; }

    public string? Mensaje { get; private init; }

    public PagoSuscripcionDto? Pago { get; private init; }

    public static OperacionPago Ok(PagoSuscripcionDto pago) =>
        new() { Exitoso = true, StatusCode = 200, Pago = pago };

    public static OperacionPago Fail(int statusCode, string mensaje) =>
        new() { Exitoso = false, StatusCode = statusCode, Mensaje = mensaje };
}
