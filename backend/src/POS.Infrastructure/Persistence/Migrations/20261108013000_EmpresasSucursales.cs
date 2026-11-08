using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using POS.Infrastructure.Persistence;

#nullable disable

namespace POS.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20261108013000_EmpresasSucursales")]
    public class EmpresasSucursales : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE TABLE IF NOT EXISTS empresas (
                    "Id" uuid NOT NULL,
                    "Nombre" character varying(160) NOT NULL,
                    "Slug" character varying(40) NOT NULL,
                    "FechaCreacion" timestamp with time zone NOT NULL,
                    CONSTRAINT "PK_empresas" PRIMARY KEY ("Id")
                );
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_empresas_Slug" ON empresas ("Slug");

                ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "EmpresaId" uuid;
                ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "ParentSucursalId" uuid;
                ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "Codigo" character varying(32);
                ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "Slug" character varying(40);

                INSERT INTO empresas ("Id", "Nombre", "Slug", "FechaCreacion")
                SELECT t."Id",
                       t."NombreComercial",
                       'emp-' || substr(replace(t."Id"::text, '-', ''), 1, 12),
                       t."FechaCreacion"
                FROM tenants t
                WHERE NOT EXISTS (SELECT 1 FROM empresas e WHERE e."Id" = t."Id");

                UPDATE tenants
                SET "EmpresaId" = "Id",
                    "Codigo" = 'SUC-' || upper(substr(replace("Id"::text, '-', ''), 1, 8)),
                    "Slug" = 'sucursal'
                WHERE "EmpresaId" IS NULL;

                ALTER TABLE tenants ALTER COLUMN "EmpresaId" SET NOT NULL;
                ALTER TABLE tenants ALTER COLUMN "Codigo" SET NOT NULL;
                ALTER TABLE tenants ALTER COLUMN "Slug" SET NOT NULL;

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_tenants_Codigo" ON tenants ("Codigo");
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_tenants_EmpresaId_Slug" ON tenants ("EmpresaId", "Slug");
                CREATE INDEX IF NOT EXISTS "IX_tenants_ParentSucursalId" ON tenants ("ParentSucursalId");

                ALTER TABLE tenants DROP CONSTRAINT IF EXISTS "FK_tenants_empresas_EmpresaId";
                ALTER TABLE tenants
                    ADD CONSTRAINT "FK_tenants_empresas_EmpresaId"
                    FOREIGN KEY ("EmpresaId") REFERENCES empresas ("Id") ON DELETE RESTRICT;

                ALTER TABLE tenants DROP CONSTRAINT IF EXISTS "FK_tenants_tenants_ParentSucursalId";
                ALTER TABLE tenants
                    ADD CONSTRAINT "FK_tenants_tenants_ParentSucursalId"
                    FOREIGN KEY ("ParentSucursalId") REFERENCES tenants ("Id") ON DELETE RESTRICT;

                DROP INDEX IF EXISTS "IX_tenants_RucRfc";
                CREATE INDEX IF NOT EXISTS "IX_tenants_RucRfc" ON tenants ("RucRfc");
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE tenants DROP CONSTRAINT IF EXISTS "FK_tenants_tenants_ParentSucursalId";
                ALTER TABLE tenants DROP CONSTRAINT IF EXISTS "FK_tenants_empresas_EmpresaId";
                DROP INDEX IF EXISTS "IX_tenants_Codigo";
                DROP INDEX IF EXISTS "IX_tenants_EmpresaId_Slug";
                DROP INDEX IF EXISTS "IX_tenants_ParentSucursalId";
                DROP INDEX IF EXISTS "IX_tenants_RucRfc";
                ALTER TABLE tenants DROP COLUMN IF EXISTS "ParentSucursalId";
                ALTER TABLE tenants DROP COLUMN IF EXISTS "Codigo";
                ALTER TABLE tenants DROP COLUMN IF EXISTS "Slug";
                ALTER TABLE tenants DROP COLUMN IF EXISTS "EmpresaId";
                DROP TABLE IF EXISTS empresas;
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_tenants_RucRfc" ON tenants ("RucRfc");
                """);
        }
    }
}
