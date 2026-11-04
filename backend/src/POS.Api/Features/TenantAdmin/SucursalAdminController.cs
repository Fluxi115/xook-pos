using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using POS.Application.Caja;
using POS.Application.TenantAdmin;

namespace POS.Api.Features.TenantAdmin;

[Authorize(Roles = "AdminSucursal,SuperAdmin")]
[ApiController]
[Route("api/v1/tenant-admin")]
public sealed class SucursalAdminController : ControllerBase
{
    private readonly TenantStoreService _tienda;
    private readonly CajaTurnoService _caja;

    public SucursalAdminController(TenantStoreService tienda, CajaTurnoService caja)
    {
        _tienda = tienda;
        _caja = caja;
    }

    [HttpGet("dashboard/metrics")]
    public async Task<IActionResult> Metricas(CancellationToken cancellationToken)
    {
        var resultado = await _tienda.MetricasAsync(cancellationToken);
        return Responder(resultado);
    }

    [HttpGet("productos")]
    public async Task<IActionResult> Productos(CancellationToken cancellationToken)
    {
        return Ok(await _tienda.ListarProductosAsync(cancellationToken));
    }

    [HttpGet("categorias")]
    public async Task<IActionResult> Categorias(CancellationToken cancellationToken)
    {
        return Ok(await _tienda.ListarCategoriasAsync(cancellationToken));
    }

    [HttpGet("modificadores")]
    public async Task<IActionResult> Modificadores(CancellationToken cancellationToken)
    {
        return Ok(await _tienda.ListarModificadoresAsync(cancellationToken));
    }

    [HttpGet("cortes")]
    public async Task<IActionResult> Cortes(CancellationToken cancellationToken)
    {
        return Ok(await _caja.ListarCortesAsync(cancellationToken));
    }

    [HttpPost("productos")]
    public async Task<IActionResult> CrearProducto([FromBody] GuardarProductoRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _tienda.CrearProductoAsync(request, cancellationToken);
        return Responder(resultado);
    }

    [HttpPut("productos/{id:guid}")]
    public async Task<IActionResult> ActualizarProducto(Guid id, [FromBody] GuardarProductoRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _tienda.ActualizarProductoAsync(id, request, cancellationToken);
        return Responder(resultado);
    }

    [HttpDelete("productos/{id:guid}")]
    public async Task<IActionResult> EliminarProducto(Guid id, CancellationToken cancellationToken)
    {
        var resultado = await _tienda.EliminarProductoAsync(id, cancellationToken);
        if (!resultado.Exitoso)
        {
            return StatusCode(resultado.StatusCode, new { mensaje = resultado.Mensaje });
        }

        return Ok(new { mensaje = "Producto eliminado." });
    }

    [HttpGet("usuarios")]
    public async Task<IActionResult> Usuarios(CancellationToken cancellationToken)
    {
        return Ok(await _tienda.ListarUsuariosAsync(cancellationToken));
    }

    [HttpPost("usuarios")]
    public async Task<IActionResult> CrearUsuario([FromBody] CrearUsuarioSucursalRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _tienda.CrearUsuarioAsync(request, cancellationToken);
        return Responder(resultado);
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
