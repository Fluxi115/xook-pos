-- Cobranza del vendedor. Ejecutar en el editor SQL de Supabase.
-- Registra pagos en efectivo o transferencia y no modifica las ventas de la caja.

CREATE TABLE IF NOT EXISTS pagos_suscripcion (
    "Id" uuid NOT NULL,
    "TenantId" uuid NOT NULL,
    "Monto" numeric(18,2) NOT NULL,
    "Medio" character varying(20) NOT NULL,
    "FechaPago" timestamp with time zone NOT NULL,
    "Meses" integer NOT NULL,
    "VigenciaHasta" timestamp with time zone NOT NULL,
    "Nota" character varying(200),
    CONSTRAINT "PK_pagos_suscripcion" PRIMARY KEY ("Id"),
    CONSTRAINT "FK_pagos_suscripcion_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_pagos_suscripcion_TenantId_FechaPago"
    ON pagos_suscripcion ("TenantId", "FechaPago");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20261106223000_PagosSuscripcion', '8.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;
