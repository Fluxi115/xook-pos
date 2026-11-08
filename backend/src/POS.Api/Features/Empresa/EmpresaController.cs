using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Application.Empresas;
using POS.Application.TenantAdmin;

namespace POS.Api.Features.Empresa;

[Authorize(Roles = "AdminEmpresa")]
[ApiController]
[Route("api/v1/empresa")]
public sealed class EmpresaController : ControllerBase
{
    private readonly EmpresaAdminService _empresa;

    public EmpresaController(EmpresaAdminService empresa)
    {
        _empresa = empresa;
    }

    [HttpGet]
    public async Task<IActionResult> Panel(CancellationToken cancellationToken)
    {
        return Responder(await _empresa.PanelAsync(cancellationToken));
    }

    [HttpPost("sucursales")]
    public async Task<IActionResult> CrearSucursal([FromBody] CrearSucursalEmpresaRequest request, CancellationToken cancellationToken)
    {
        return Responder(await _empresa.CrearSucursalPropiaAsync(request, cancellationToken));
    }

    [HttpPost("sucursales/{id:guid}/gerentes")]
    public async Task<IActionResult> CrearGerente(Guid id, [FromBody] CrearGerenteRequest request, CancellationToken cancellationToken)
    {
        return Responder(await _empresa.CrearGerenteAsync(id, request, cancellationToken));
    }

    private IActionResult Responder<T>(Resultado<T> resultado)
    {
        if (!resultado.Exitoso)
        {
            return StatusCode(resultado.StatusCode, new { mensaje = resultado.Mensaje });
        }

        return Ok(resultado.Valor);
    }
}
