using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Application.Empresas;
using POS.Application.SuperAdmin;

namespace POS.Api.Features.SuperAdmin;

[Authorize(Roles = "SuperAdmin")]
[ApiController]
[Route("api/v1/superadmin/tenants")]
public sealed class TenantsController : ControllerBase
{
    private readonly TenantAdminService _tenants;
    private readonly EmpresaAdminService _empresas;

    public TenantsController(TenantAdminService tenants, EmpresaAdminService empresas)
    {
        _tenants = tenants;
        _empresas = empresas;
    }

    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken cancellationToken)
    {
        var lista = await _tenants.ListarAsync(cancellationToken);
        return Ok(lista);
    }

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearTenantRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _tenants.CrearAsync(request, cancellationToken);
        if (!resultado.Exitoso)
        {
            return StatusCode(resultado.StatusCode, new { mensaje = resultado.Mensaje });
        }

        return Ok(resultado.Tenant);
    }

    [HttpPost("/api/v1/superadmin/empresas/{empresaId:guid}/sucursales")]
    public async Task<IActionResult> CrearSucursal(Guid empresaId, [FromBody] CrearSucursalEmpresaRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _empresas.CrearSucursalAsync(empresaId, request, cancellationToken);
        if (!resultado.Exitoso)
        {
            return StatusCode(resultado.StatusCode, new { mensaje = resultado.Mensaje });
        }

        return Ok(resultado.Valor);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Actualizar(Guid id, [FromBody] ActualizarTenantRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _tenants.ActualizarAsync(id, request, cancellationToken);
        if (!resultado.Exitoso)
        {
            return StatusCode(resultado.StatusCode, new { mensaje = resultado.Mensaje });
        }

        return Ok(resultado.Tenant);
    }

    [HttpPut("{id:guid}/suscripcion")]
    public async Task<IActionResult> ActualizarSuscripcion(
        Guid id,
        [FromBody] ActualizarSuscripcionRequest request,
        CancellationToken cancellationToken)
    {
        var resultado = await _tenants.ActualizarSuscripcionAsync(id, request, cancellationToken);
        if (!resultado.Exitoso)
        {
            return StatusCode(resultado.StatusCode, new { mensaje = resultado.Mensaje });
        }

        return Ok(resultado.Tenant);
    }

    [HttpGet("/api/v1/superadmin/pagos")]
    public async Task<IActionResult> Pagos(CancellationToken cancellationToken)
    {
        return Ok(await _tenants.ListarPagosAsync(cancellationToken));
    }

    [HttpPost("{id:guid}/pagos")]
    public async Task<IActionResult> RegistrarPago(Guid id, [FromBody] RegistrarPagoRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _tenants.RegistrarPagoAsync(id, request, cancellationToken);
        if (!resultado.Exitoso)
        {
            return StatusCode(resultado.StatusCode, new { mensaje = resultado.Mensaje });
        }

        return Ok(resultado.Pago);
    }
}
