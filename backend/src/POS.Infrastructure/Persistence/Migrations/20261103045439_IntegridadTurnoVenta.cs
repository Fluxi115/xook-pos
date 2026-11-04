using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace POS.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class IntegridadTurnoVenta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE turnos_caja
                SET Estado = 'Cerrado', FechaCierre = CURRENT_TIMESTAMP
                WHERE Estado = 'Abierto'
                  AND Id NOT IN (
                    SELECT Id FROM (
                      SELECT t.Id
                      FROM turnos_caja AS t
                      INNER JOIN (
                        SELECT TenantId, UsuarioId, MIN(FechaApertura) AS Primera
                        FROM turnos_caja
                        WHERE Estado = 'Abierto'
                        GROUP BY TenantId, UsuarioId
                      ) AS primero
                        ON primero.TenantId = t.TenantId
                       AND primero.UsuarioId = t.UsuarioId
                       AND primero.Primera = t.FechaApertura
                      WHERE t.Estado = 'Abierto'
                    )
                  );
                """);

            migrationBuilder.AddColumn<Guid>(
                name: "TurnoCajaId",
                table: "ventas",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ventas_TurnoCajaId",
                table: "ventas",
                column: "TurnoCajaId");

            migrationBuilder.CreateIndex(
                name: "IX_turnos_caja_un_abierto",
                table: "turnos_caja",
                columns: new[] { "TenantId", "UsuarioId" },
                unique: true,
                filter: "\"Estado\" = 'Abierto'");

            migrationBuilder.AddForeignKey(
                name: "FK_ventas_turnos_caja_TurnoCajaId",
                table: "ventas",
                column: "TurnoCajaId",
                principalTable: "turnos_caja",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ventas_turnos_caja_TurnoCajaId",
                table: "ventas");

            migrationBuilder.DropIndex(
                name: "IX_ventas_TurnoCajaId",
                table: "ventas");

            migrationBuilder.DropIndex(
                name: "IX_turnos_caja_un_abierto",
                table: "turnos_caja");

            migrationBuilder.DropColumn(
                name: "TurnoCajaId",
                table: "ventas");
        }
    }
}
