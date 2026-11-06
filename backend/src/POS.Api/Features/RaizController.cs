using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace POS.Api.Features;

[ApiController]
[AllowAnonymous]
public sealed class RaizController : ControllerBase
{
    [HttpGet("/")]
    [HttpGet("/api/v1")]
    public IActionResult Inicio()
    {
        return Ok(new
        {
            servicio = "Xook POS",
            estado = "activa",
            mensaje = "La API de Xook POS está activa y funcionando."
        });
    }
}
