using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Application.Auth;

namespace POS.Api.Features.Auth;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth)
    {
        _auth = auth;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _auth.IniciarSesionAsync(request, cancellationToken);
        if (!resultado.Exitoso)
        {
            return StatusCode(resultado.StatusCode, new { mensaje = resultado.Mensaje });
        }

        return Ok(resultado.Sesion);
    }
}
