using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using POS.Domain.Entities;

namespace POS.Infrastructure.Persistence;

internal sealed class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.ToTable("tenants");
        builder.Property(t => t.NombreComercial).HasMaxLength(160).IsRequired();
        builder.Property(t => t.RucRfc).HasMaxLength(20).IsRequired();
        builder.HasIndex(t => t.RucRfc).IsUnique();
        builder.Property(t => t.Telefono).HasMaxLength(30);
        builder.Property(t => t.Direccion).HasMaxLength(200);
        builder.Property(t => t.MensajeTicket).HasMaxLength(200);
        builder.Property(t => t.TasaImpuesto).HasPrecision(6, 4);
        builder.Property(t => t.LogoUrl).HasColumnType("text");
        builder.Property(t => t.Estado).HasConversion<string>().HasMaxLength(20);
    }
}

internal sealed class PagoSuscripcionConfiguration : IEntityTypeConfiguration<PagoSuscripcion>
{
    public void Configure(EntityTypeBuilder<PagoSuscripcion> builder)
    {
        builder.ToTable("pagos_suscripcion");
        builder.Property(p => p.Monto).HasPrecision(18, 2);
        builder.Property(p => p.Medio).HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Nota).HasMaxLength(200);
        builder.HasIndex(p => new { p.TenantId, p.FechaPago });
        builder.HasOne(p => p.Tenant)
            .WithMany()
            .HasForeignKey(p => p.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class UsuarioConfiguration : IEntityTypeConfiguration<Usuario>
{
    public void Configure(EntityTypeBuilder<Usuario> builder)
    {
        builder.ToTable("usuarios");
        builder.Property(u => u.Nombre).HasMaxLength(160).IsRequired();
        builder.Property(u => u.Username).HasMaxLength(80).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(200).IsRequired();
        builder.Property(u => u.Rol).HasConversion<string>().HasMaxLength(30);
        builder.HasIndex(u => u.Username).IsUnique();
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(u => u.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class CategoriaConfiguration : IEntityTypeConfiguration<Categoria>
{
    public void Configure(EntityTypeBuilder<Categoria> builder)
    {
        builder.ToTable("categorias");
        builder.Property(c => c.Nombre).HasMaxLength(120).IsRequired();
        builder.Property(c => c.IconoUrl).HasMaxLength(500);
        builder.HasIndex(c => new { c.TenantId, c.Orden });
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(c => c.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class ProductoConfiguration : IEntityTypeConfiguration<Producto>
{
    public void Configure(EntityTypeBuilder<Producto> builder)
    {
        builder.ToTable("productos");
        builder.Property(p => p.Nombre).HasMaxLength(160).IsRequired();
        builder.Property(p => p.Descripcion).HasMaxLength(500);
        builder.Property(p => p.FotoUrl).HasColumnType("text");
        builder.Property(p => p.PrecioBase).HasPrecision(18, 2);
        builder.HasIndex(p => new { p.TenantId, p.CategoriaId });
        builder.HasOne(p => p.Categoria)
            .WithMany(c => c.Productos)
            .HasForeignKey(p => p.CategoriaId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(p => p.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class GrupoModificadorConfiguration : IEntityTypeConfiguration<GrupoModificador>
{
    public void Configure(EntityTypeBuilder<GrupoModificador> builder)
    {
        builder.ToTable("grupos_modificador");
        builder.Property(g => g.Nombre).HasMaxLength(120).IsRequired();
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(g => g.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class OpcionModificadorConfiguration : IEntityTypeConfiguration<OpcionModificador>
{
    public void Configure(EntityTypeBuilder<OpcionModificador> builder)
    {
        builder.ToTable("opciones_modificador");
        builder.Property(o => o.Nombre).HasMaxLength(120).IsRequired();
        builder.Property(o => o.PrecioAdicional).HasPrecision(18, 2);
        builder.HasOne(o => o.GrupoModificador)
            .WithMany(g => g.Opciones)
            .HasForeignKey(o => o.GrupoModificadorId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(o => o.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class ProductoModificadorConfiguration : IEntityTypeConfiguration<ProductoModificador>
{
    public void Configure(EntityTypeBuilder<ProductoModificador> builder)
    {
        builder.ToTable("productos_modificador");
        builder.HasIndex(pm => new { pm.ProductoId, pm.GrupoModificadorId }).IsUnique();
        builder.HasOne(pm => pm.Producto)
            .WithMany(p => p.Grupos)
            .HasForeignKey(pm => pm.ProductoId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(pm => pm.GrupoModificador)
            .WithMany(g => g.Productos)
            .HasForeignKey(pm => pm.GrupoModificadorId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(pm => pm.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class VentaConfiguration : IEntityTypeConfiguration<Venta>
{
    public void Configure(EntityTypeBuilder<Venta> builder)
    {
        builder.ToTable("ventas");
        builder.Property(v => v.Id).ValueGeneratedNever();
        builder.Property(v => v.FolioVenta).HasMaxLength(40).IsRequired();
        builder.Property(v => v.Subtotal).HasPrecision(18, 2);
        builder.Property(v => v.Total).HasPrecision(18, 2);
        builder.Property(v => v.MetodoPago).HasConversion<string>().HasMaxLength(20);
        builder.Property(v => v.EstadoSincronizacion).HasConversion<string>().HasMaxLength(20);
        builder.Property(v => v.MotivoCancelacion).HasMaxLength(200);
        builder.HasIndex(v => new { v.TenantId, v.FolioVenta }).IsUnique();
        builder.HasIndex(v => new { v.TenantId, v.EstadoSincronizacion });
        builder.HasIndex(v => v.TurnoCajaId);
        builder.HasOne(v => v.Turno)
            .WithMany()
            .HasForeignKey(v => v.TurnoCajaId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(v => v.Usuario)
            .WithMany()
            .HasForeignKey(v => v.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(v => v.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(v => v.Detalles)
            .WithOne(d => d.Venta)
            .HasForeignKey(d => d.VentaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class TurnoCajaConfiguration : IEntityTypeConfiguration<TurnoCaja>
{
    public void Configure(EntityTypeBuilder<TurnoCaja> builder)
    {
        builder.ToTable("turnos_caja");
        builder.Property(t => t.FondoInicial).HasPrecision(18, 2);
        builder.Property(t => t.Estado).HasConversion<string>().HasMaxLength(20);
        builder.HasIndex(t => new { t.TenantId, t.UsuarioId, t.Estado });
        builder.HasIndex(t => new { t.TenantId, t.UsuarioId })
            .IsUnique()
            .HasDatabaseName("IX_turnos_caja_un_abierto")
            .HasFilter("\"Estado\" = 'Abierto'");
        builder.HasOne(t => t.Usuario)
            .WithMany()
            .HasForeignKey(t => t.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(t => t.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class MovimientoCajaConfiguration : IEntityTypeConfiguration<MovimientoCaja>
{
    public void Configure(EntityTypeBuilder<MovimientoCaja> builder)
    {
        builder.ToTable("movimientos_caja");
        builder.Property(m => m.Monto).HasPrecision(18, 2);
        builder.Property(m => m.Tipo).HasConversion<string>().HasMaxLength(20);
        builder.Property(m => m.Motivo).HasMaxLength(160).IsRequired();
        builder.HasIndex(m => m.TurnoCajaId);
        builder.HasOne(m => m.Turno)
            .WithMany(t => t.Movimientos)
            .HasForeignKey(m => m.TurnoCajaId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(m => m.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class CorteCajaConfiguration : IEntityTypeConfiguration<CorteCaja>
{
    public void Configure(EntityTypeBuilder<CorteCaja> builder)
    {
        builder.ToTable("cortes_caja");
        builder.Property(c => c.TotalVentasEfectivo).HasPrecision(18, 2);
        builder.Property(c => c.TotalVentasTarjeta).HasPrecision(18, 2);
        builder.Property(c => c.TotalVentasTransferencia).HasPrecision(18, 2);
        builder.Property(c => c.TotalVentasMixto).HasPrecision(18, 2);
        builder.Property(c => c.FondoInicial).HasPrecision(18, 2);
        builder.Property(c => c.TotalEntradas).HasPrecision(18, 2);
        builder.Property(c => c.TotalSalidas).HasPrecision(18, 2);
        builder.Property(c => c.EfectivoEsperado).HasPrecision(18, 2);
        builder.Property(c => c.EfectivoContado).HasPrecision(18, 2);
        builder.Property(c => c.Diferencia).HasPrecision(18, 2);
        builder.Property(c => c.Observaciones).HasMaxLength(500);
        builder.HasIndex(c => c.TurnoCajaId).IsUnique();
        builder.HasIndex(c => new { c.TenantId, c.FechaCorte });
        builder.HasOne(c => c.Turno)
            .WithMany()
            .HasForeignKey(c => c.TurnoCajaId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(c => c.Usuario)
            .WithMany()
            .HasForeignKey(c => c.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(c => c.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal sealed class VentaDetalleConfiguration : IEntityTypeConfiguration<VentaDetalle>
{
    public void Configure(EntityTypeBuilder<VentaDetalle> builder)
    {
        builder.ToTable("venta_detalles");
        builder.Property(d => d.Id).ValueGeneratedNever();
        builder.Property(d => d.NombreProducto).HasMaxLength(160).IsRequired();
        builder.Property(d => d.PrecioUnitario).HasPrecision(18, 2);
        builder.Property(d => d.TotalLinea).HasPrecision(18, 2);
        builder.Property(d => d.ModificadoresJson).IsRequired();
        builder.HasIndex(d => d.VentaId);
        builder.HasOne<Tenant>()
            .WithMany()
            .HasForeignKey(d => d.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
