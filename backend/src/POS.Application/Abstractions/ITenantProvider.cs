namespace POS.Application.Abstractions;

public interface ITenantProvider
{
    Guid TenantId { get; }
}
