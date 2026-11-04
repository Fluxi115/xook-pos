using POS.Domain.Common;
using POS.Domain.Enums;

namespace POS.Domain.Entities;

public class Usuario : TenantEntity
{
    public string Nombre { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public RolUsuario Rol { get; set; }

    public bool Activo { get; set; } = true;
}
