-- Cupo de cajas y meseros por sucursal. Ejecutar en el editor SQL de Supabase.
-- Elige "Run and enable RLS" si vuelve a preguntar; estas columnas van en una tabla que ya existe.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "MaxCajas" integer NOT NULL DEFAULT 1;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "MaxMeseros" integer NOT NULL DEFAULT 1;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261106233000_CuposSucursal', '8.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;
