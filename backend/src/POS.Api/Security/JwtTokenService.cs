using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using POS.Application.Abstractions;
using POS.Domain.Entities;

namespace POS.Api.Security;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "pos-gastro";

    public string Audience { get; set; } = "pos-gastro-web";

    public string Key { get; set; } = string.Empty;

    public int ExpiraHoras { get; set; } = 12;
}

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public (string Token, DateTime ExpiraUtc) Crear(Usuario usuario)
    {
        var expira = DateTime.UtcNow.AddHours(_options.ExpiraHoras <= 0 ? 12 : _options.ExpiraHoras);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var credenciales = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new(HttpCurrentUser.TenantClaim, usuario.TenantId.ToString()),
            new(HttpCurrentUser.RolClaim, usuario.Rol.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, usuario.Username),
            new("nombre", usuario.Nombre)
        };

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expira,
            signingCredentials: credenciales);

        return (new JwtSecurityTokenHandler().WriteToken(token), expira);
    }
}
