using POS.Application.Abstractions;
using POS.Application.Common;
using POS.Application.Suscripcion;

namespace POS.Api.Middleware;

public sealed class TenantSubscriptionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantSubscriptionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        ITenantProvider tenantProvider,
        ICurrentUser currentUser,
        ISuscripcionGuard suscripcion)
    {
        var endpoint = context.GetEndpoint();
        if (endpoint?.Metadata.GetMetadata<Microsoft.AspNetCore.Authorization.IAllowAnonymous>() is not null
            || context.User.Identity?.IsAuthenticated != true
            || currentUser.Rol == "SuperAdmin")
        {
            await _next(context);
            return;
        }

        if (tenantProvider.TenantId == Guid.Empty)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { mensaje = "El token no incluye una sucursal válida." });
            return;
        }

        var vigente = await suscripcion.SuscripcionVigenteAsync(tenantProvider.TenantId, context.RequestAborted);
        if (!vigente)
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { mensaje = MensajesSuscripcion.VencidaOInactiva });
            return;
        }

        await _next(context);
    }
}
