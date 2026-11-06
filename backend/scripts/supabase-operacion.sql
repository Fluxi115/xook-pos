-- Reportes, anulación de ventas y datos del ticket. Ejecutar en el editor SQL de Supabase.
-- Elige "Run and enable RLS" si vuelve a preguntar; estas columnas van en tablas que ya existen.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "Direccion" character varying(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "MensajeTicket" character varying(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "TasaImpuesto" numeric(6,4) NOT NULL DEFAULT 0;

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS "Cancelada" boolean NOT NULL DEFAULT false;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS "FechaCancelacion" timestamp with time zone;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS "MotivoCancelacion" character varying(200);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261106224500_OperacionSucursal', '8.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;
