using POS.Domain.Entities;

namespace POS.Application.Abstractions;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiraUtc) Crear(Usuario usuario);
}
