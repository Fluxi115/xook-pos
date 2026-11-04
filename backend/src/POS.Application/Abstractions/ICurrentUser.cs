namespace POS.Application.Abstractions;

public interface ICurrentUser
{
    Guid UsuarioId { get; }

    string? Rol { get; }

    bool EstaAutenticado { get; }
}
