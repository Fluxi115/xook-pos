using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Application.Caja;
using POS.Application.TenantAdmin;

namespace POS.Api.Features.Caja;

[Authorize]
[ApiController]
[Route("api/v1/caja/turnos")]
public sealed class TurnosCajaController : ControllerBase
{
    private readonly CajaTurnoService _caja;

    public TurnosCajaController(CajaTurnoService caja)
    {
        _caja = caja;
    }

    [HttpPost("abrir")]
    public async Task<IActionResult> Abrir([FromBody] AbrirTurnoRequest request, CancellationToken cancellationToken)
    {
        return Responder(await _caja.AbrirAsync(request, cancellationToken));
    }

    [HttpGet("activo")]
    public async Task<IActionResult> Activo(CancellationToken cancellationToken)
    {
        return Responder(await _caja.ActivoAsync(cancellationToken));
    }

    [HttpPost("movimientos")]
    public async Task<IActionResult> Movimiento([FromBody] MovimientoCajaRequest request, CancellationToken cancellationToken)
    {
        return Responder(await _caja.RegistrarMovimientoAsync(request, cancellationToken));
    }

    [HttpPost("cerrar")]
    public async Task<IActionResult> Cerrar([FromBody] CerrarTurnoRequest request, CancellationToken cancellationToken)
    {
        return Responder(await _caja.CerrarAsync(request, cancellationToken));
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
