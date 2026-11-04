using Microsoft.EntityFrameworkCore;
using POS.Application.Abstractions;
using POS.Application.Common;
using POS.Domain.Enums;

namespace POS.Application.Auth;

public sealed class AuthService
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _hasher;
    private readonly IJwtTokenService _jwt;

    public AuthService(IAppDbContext db, IPasswordHasher hasher, IJwtTokenService jwt)
    {
        _db = db;
        _hasher = hasher;
        _jwt = jwt;
    }

    public async Task<AuthResult> IniciarSesionAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var username = request.Username.Trim().ToLowerInvariant();
        if (username.Length == 0 || string.IsNullOrWhiteSpace(request.Password))
        {
            return AuthResult.Fail(400, "Usuario y contraseña son obligatorios.");
        }

        var usuario = await _db.Usuarios
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);

        if (usuario is null || !usuario.Activo || !_hasher.Verify(request.Password, usuario.PasswordHash))
        {
            return AuthResult.Fail(401, "Credenciales incorrectas.");
        }

        if (usuario.Rol != RolUsuario.SuperAdmin)
        {
            var tenant = await _db.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == usuario.TenantId, cancellationToken);

            if (tenant is null || tenant.Estado != EstadoTenant.Activo || DateTime.UtcNow > tenant.FechaVencimiento)
            {
                return AuthResult.Fail(403, MensajesSuscripcion.VencidaOInactiva);
            }
        }

        var (token, expira) = _jwt.Crear(usuario);
        return AuthResult.Ok(new LoginResponse
        {
            Token = token,
            ExpiraUtc = expira,
            UsuarioId = usuario.Id,
            TenantId = usuario.TenantId,
            Nombre = usuario.Nombre,
            Rol = usuario.Rol.ToString()
        });
    }
}
