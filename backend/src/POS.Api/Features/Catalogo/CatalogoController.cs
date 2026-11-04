using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Application.Catalogo;

namespace POS.Api.Features.Catalogo;

[Authorize]
[ApiController]
[Route("api/v1/catalogo")]
public sealed class CatalogoController : ControllerBase
{
    private readonly CatalogoService _catalogo;

    public CatalogoController(CatalogoService catalogo)
    {
        _catalogo = catalogo;
    }

    [HttpGet]
    public async Task<IActionResult> Obtener(CancellationToken cancellationToken)
    {
        var catalogo = await _catalogo.ObtenerAsync(cancellationToken);
        if (catalogo is null)
        {
            return NotFound(new { mensaje = "Sucursal no encontrada." });
        }

        return Ok(catalogo);
    }
}
