using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace POS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class TurnosCaja : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "turnos_caja",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FechaApertura = table.Column<DateTime>(type: "TEXT", nullable: false),
                    FechaCierre = table.Column<DateTime>(type: "TEXT", nullable: true),
                    FondoInicial = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Estado = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_turnos_caja", x => x.Id);
                    table.ForeignKey(
                        name: "FK_turnos_caja_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_turnos_caja_usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cortes_caja",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TurnoCajaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FechaCorte = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TotalVentasEfectivo = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    TotalVentasTarjeta = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    TotalVentasTransferencia = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    TotalVentasMixto = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    FondoInicial = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    TotalEntradas = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    TotalSalidas = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    EfectivoEsperado = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    EfectivoContado = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Diferencia = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Observaciones = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cortes_caja", x => x.Id);
                    table.ForeignKey(
                        name: "FK_cortes_caja_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cortes_caja_turnos_caja_TurnoCajaId",
                        column: x => x.TurnoCajaId,
                        principalTable: "turnos_caja",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cortes_caja_usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "movimientos_caja",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TurnoCajaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Monto = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Motivo = table.Column<string>(type: "TEXT", maxLength: 160, nullable: false),
                    FechaHora = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TenantId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_movimientos_caja", x => x.Id);
                    table.ForeignKey(
                        name: "FK_movimientos_caja_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_movimientos_caja_turnos_caja_TurnoCajaId",
                        column: x => x.TurnoCajaId,
                        principalTable: "turnos_caja",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_cortes_caja_TenantId_FechaCorte",
                table: "cortes_caja",
                columns: new[] { "TenantId", "FechaCorte" });

            migrationBuilder.CreateIndex(
                name: "IX_cortes_caja_TurnoCajaId",
                table: "cortes_caja",
                column: "TurnoCajaId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_cortes_caja_UsuarioId",
                table: "cortes_caja",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_movimientos_caja_TenantId",
                table: "movimientos_caja",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_movimientos_caja_TurnoCajaId",
                table: "movimientos_caja",
                column: "TurnoCajaId");

            migrationBuilder.CreateIndex(
                name: "IX_turnos_caja_TenantId_UsuarioId_Estado",
                table: "turnos_caja",
                columns: new[] { "TenantId", "UsuarioId", "Estado" });

            migrationBuilder.CreateIndex(
                name: "IX_turnos_caja_UsuarioId",
                table: "turnos_caja",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cortes_caja");

            migrationBuilder.DropTable(
                name: "movimientos_caja");

            migrationBuilder.DropTable(
                name: "turnos_caja");
        }
    }
}
