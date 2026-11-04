namespace POS.Domain.Common;

public abstract class TenantEntity : IMustHaveTenant
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
}
