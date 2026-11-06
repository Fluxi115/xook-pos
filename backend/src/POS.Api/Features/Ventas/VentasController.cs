using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Application.Ventas;

namespace POS.Api.Features.Ventas;

[Authorize(Roles = "Cajero,AdminSucursal")]
[ApiController]
[Route("api/v1/ventas")]
public sealed class VentasController : ControllerBase
{
    private readonly VentaSyncService _sync;

    public VentasController(VentaSyncService sync)
    {
        _sync = sync;
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync([FromBody] SyncVentasRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _sync.SincronizarAsync(request, cancellationToken);
        return Ok(resultado);
    }
}
