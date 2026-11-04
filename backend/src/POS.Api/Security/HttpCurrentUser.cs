using System.IdentityModel.Tokens.Jwt;
using POS.Application.Abstractions;

namespace POS.Api.Security;

public sealed class HttpCurrentUser : ITenantProvider, ICurrentUser
{
    public const string TenantClaim = "tenant_id";
    public const string RolClaim = "rol";

    private readonly IHttpContextAccessor _accessor;

    public HttpCurrentUser(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    public Guid TenantId => LeerGuid(TenantClaim);

    public Guid UsuarioId => LeerGuid(JwtRegisteredClaimNames.Sub);

    public string? Rol => _accessor.HttpContext?.User.FindFirst(RolClaim)?.Value;

    public bool EstaAutenticado => _accessor.HttpContext?.User.Identity?.IsAuthenticated == true;

    private Guid LeerGuid(string claim)
    {
        var valor = _accessor.HttpContext?.User.FindFirst(claim)?.Value;
        return Guid.TryParse(valor, out var id) ? id : Guid.Empty;
    }
}
