namespace POS.Application.Auth;

public sealed class LoginRequest
{
    public string Username { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;
}

public sealed class LoginResponse
{
    public string Token { get; set; } = string.Empty;

    public DateTime ExpiraUtc { get; set; }

    public Guid UsuarioId { get; set; }

    public Guid TenantId { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string Rol { get; set; } = string.Empty;
}

public sealed class AuthResult
{
    public bool Exitoso { get; private init; }

    public int StatusCode { get; private init; }

    public string? Mensaje { get; private init; }

    public LoginResponse? Sesion { get; private init; }

    public static AuthResult Ok(LoginResponse sesion) =>
        new() { Exitoso = true, StatusCode = 200, Sesion = sesion };

    public static AuthResult Fail(int statusCode, string mensaje) =>
        new() { Exitoso = false, StatusCode = statusCode, Mensaje = mensaje };
}
