using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using POS.Infrastructure.Persistence;

#nullable disable

namespace POS.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20261106224500_OperacionSucursal")]
    public class OperacionSucursal : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Direccion",
                table: "tenants",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MensajeTicket",
                table: "tenants",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TasaImpuesto",
                table: "tenants",
                type: "numeric(6,4)",
                precision: 6,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "Cancelada",
                table: "ventas",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaCancelacion",
                table: "ventas",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotivoCancelacion",
                table: "ventas",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Direccion", table: "tenants");
            migrationBuilder.DropColumn(name: "MensajeTicket", table: "tenants");
            migrationBuilder.DropColumn(name: "TasaImpuesto", table: "tenants");
            migrationBuilder.DropColumn(name: "Cancelada", table: "ventas");
            migrationBuilder.DropColumn(name: "FechaCancelacion", table: "ventas");
            migrationBuilder.DropColumn(name: "MotivoCancelacion", table: "ventas");
        }
    }
}
