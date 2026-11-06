CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;


DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE tenants (
        "Id" uuid NOT NULL,
        "NombreComercial" character varying(160) NOT NULL,
        "RucRfc" character varying(20) NOT NULL,
        "Telefono" character varying(30),
        "LogoUrl" character varying(500),
        "Estado" character varying(20) NOT NULL,
        "FechaVencimiento" timestamp with time zone NOT NULL,
        "FechaCreacion" timestamp with time zone NOT NULL,
        CONSTRAINT "PK_tenants" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE categorias (
        "Id" uuid NOT NULL,
        "Nombre" character varying(120) NOT NULL,
        "Orden" integer NOT NULL,
        "IconoUrl" character varying(500),
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_categorias" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_categorias_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE grupos_modificador (
        "Id" uuid NOT NULL,
        "Nombre" character varying(120) NOT NULL,
        "EsObligatorio" boolean NOT NULL,
        "SeleccionMaxima" integer NOT NULL,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_grupos_modificador" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_grupos_modificador_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE usuarios (
        "Id" uuid NOT NULL,
        "Nombre" character varying(160) NOT NULL,
        "Username" character varying(80) NOT NULL,
        "PasswordHash" character varying(200) NOT NULL,
        "Rol" character varying(30) NOT NULL,
        "Activo" boolean NOT NULL,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_usuarios" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_usuarios_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE productos (
        "Id" uuid NOT NULL,
        "CategoriaId" uuid NOT NULL,
        "Nombre" character varying(160) NOT NULL,
        "Descripcion" character varying(500),
        "PrecioBase" numeric(18,2) NOT NULL,
        "FotoUrl" character varying(500),
        "Disponible" boolean NOT NULL,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_productos" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_productos_categorias_CategoriaId" FOREIGN KEY ("CategoriaId") REFERENCES categorias ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_productos_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE opciones_modificador (
        "Id" uuid NOT NULL,
        "GrupoModificadorId" uuid NOT NULL,
        "Nombre" character varying(120) NOT NULL,
        "PrecioAdicional" numeric(18,2) NOT NULL,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_opciones_modificador" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_opciones_modificador_grupos_modificador_GrupoModificadorId" FOREIGN KEY ("GrupoModificadorId") REFERENCES grupos_modificador ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_opciones_modificador_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE turnos_caja (
        "Id" uuid NOT NULL,
        "UsuarioId" uuid NOT NULL,
        "FechaApertura" timestamp with time zone NOT NULL,
        "FechaCierre" timestamp with time zone,
        "FondoInicial" numeric(18,2) NOT NULL,
        "Estado" character varying(20) NOT NULL,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_turnos_caja" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_turnos_caja_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_turnos_caja_usuarios_UsuarioId" FOREIGN KEY ("UsuarioId") REFERENCES usuarios ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE productos_modificador (
        "Id" uuid NOT NULL,
        "ProductoId" uuid NOT NULL,
        "GrupoModificadorId" uuid NOT NULL,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_productos_modificador" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_productos_modificador_grupos_modificador_GrupoModificadorId" FOREIGN KEY ("GrupoModificadorId") REFERENCES grupos_modificador ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_productos_modificador_productos_ProductoId" FOREIGN KEY ("ProductoId") REFERENCES productos ("Id") ON DELETE CASCADE,
        CONSTRAINT "FK_productos_modificador_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE cortes_caja (
        "Id" uuid NOT NULL,
        "TurnoCajaId" uuid NOT NULL,
        "UsuarioId" uuid NOT NULL,
        "FechaCorte" timestamp with time zone NOT NULL,
        "TotalVentasEfectivo" numeric(18,2) NOT NULL,
        "TotalVentasTarjeta" numeric(18,2) NOT NULL,
        "TotalVentasTransferencia" numeric(18,2) NOT NULL,
        "TotalVentasMixto" numeric(18,2) NOT NULL,
        "FondoInicial" numeric(18,2) NOT NULL,
        "TotalEntradas" numeric(18,2) NOT NULL,
        "TotalSalidas" numeric(18,2) NOT NULL,
        "EfectivoEsperado" numeric(18,2) NOT NULL,
        "EfectivoContado" numeric(18,2) NOT NULL,
        "Diferencia" numeric(18,2) NOT NULL,
        "Observaciones" character varying(500),
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_cortes_caja" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_cortes_caja_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_cortes_caja_turnos_caja_TurnoCajaId" FOREIGN KEY ("TurnoCajaId") REFERENCES turnos_caja ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_cortes_caja_usuarios_UsuarioId" FOREIGN KEY ("UsuarioId") REFERENCES usuarios ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE movimientos_caja (
        "Id" uuid NOT NULL,
        "TurnoCajaId" uuid NOT NULL,
        "Tipo" character varying(20) NOT NULL,
        "Monto" numeric(18,2) NOT NULL,
        "Motivo" character varying(160) NOT NULL,
        "FechaHora" timestamp with time zone NOT NULL,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_movimientos_caja" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_movimientos_caja_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_movimientos_caja_turnos_caja_TurnoCajaId" FOREIGN KEY ("TurnoCajaId") REFERENCES turnos_caja ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE ventas (
        "Id" uuid NOT NULL,
        "UsuarioId" uuid NOT NULL,
        "TurnoCajaId" uuid,
        "FolioVenta" character varying(40) NOT NULL,
        "FechaHora" timestamp with time zone NOT NULL,
        "Subtotal" numeric(18,2) NOT NULL,
        "Total" numeric(18,2) NOT NULL,
        "MetodoPago" character varying(20) NOT NULL,
        "EstadoSincronizacion" character varying(20) NOT NULL,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_ventas" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ventas_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_ventas_turnos_caja_TurnoCajaId" FOREIGN KEY ("TurnoCajaId") REFERENCES turnos_caja ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_ventas_usuarios_UsuarioId" FOREIGN KEY ("UsuarioId") REFERENCES usuarios ("Id") ON DELETE RESTRICT
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE TABLE venta_detalles (
        "Id" uuid NOT NULL,
        "VentaId" uuid NOT NULL,
        "ProductoId" uuid NOT NULL,
        "NombreProducto" character varying(160) NOT NULL,
        "Cantidad" integer NOT NULL,
        "PrecioUnitario" numeric(18,2) NOT NULL,
        "TotalLinea" numeric(18,2) NOT NULL,
        "ModificadoresJson" text NOT NULL,
        "TenantId" uuid NOT NULL,
        CONSTRAINT "PK_venta_detalles" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_venta_detalles_tenants_TenantId" FOREIGN KEY ("TenantId") REFERENCES tenants ("Id") ON DELETE RESTRICT,
        CONSTRAINT "FK_venta_detalles_ventas_VentaId" FOREIGN KEY ("VentaId") REFERENCES ventas ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_categorias_TenantId_Orden" ON categorias ("TenantId", "Orden");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_cortes_caja_TenantId_FechaCorte" ON cortes_caja ("TenantId", "FechaCorte");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE UNIQUE INDEX "IX_cortes_caja_TurnoCajaId" ON cortes_caja ("TurnoCajaId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_cortes_caja_UsuarioId" ON cortes_caja ("UsuarioId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_grupos_modificador_TenantId" ON grupos_modificador ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_movimientos_caja_TenantId" ON movimientos_caja ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_movimientos_caja_TurnoCajaId" ON movimientos_caja ("TurnoCajaId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_opciones_modificador_GrupoModificadorId" ON opciones_modificador ("GrupoModificadorId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_opciones_modificador_TenantId" ON opciones_modificador ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_productos_CategoriaId" ON productos ("CategoriaId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_productos_TenantId_CategoriaId" ON productos ("TenantId", "CategoriaId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_productos_modificador_GrupoModificadorId" ON productos_modificador ("GrupoModificadorId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE UNIQUE INDEX "IX_productos_modificador_ProductoId_GrupoModificadorId" ON productos_modificador ("ProductoId", "GrupoModificadorId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_productos_modificador_TenantId" ON productos_modificador ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE UNIQUE INDEX "IX_tenants_RucRfc" ON tenants ("RucRfc");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_turnos_caja_TenantId_UsuarioId_Estado" ON turnos_caja ("TenantId", "UsuarioId", "Estado");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE UNIQUE INDEX "IX_turnos_caja_un_abierto" ON turnos_caja ("TenantId", "UsuarioId") WHERE "Estado" = 'Abierto';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_turnos_caja_UsuarioId" ON turnos_caja ("UsuarioId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_usuarios_TenantId" ON usuarios ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE UNIQUE INDEX "IX_usuarios_Username" ON usuarios ("Username");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_venta_detalles_TenantId" ON venta_detalles ("TenantId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_venta_detalles_VentaId" ON venta_detalles ("VentaId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_ventas_TenantId_EstadoSincronizacion" ON ventas ("TenantId", "EstadoSincronizacion");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE UNIQUE INDEX "IX_ventas_TenantId_FolioVenta" ON ventas ("TenantId", "FolioVenta");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_ventas_TurnoCajaId" ON ventas ("TurnoCajaId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    CREATE INDEX "IX_ventas_UsuarioId" ON ventas ("UsuarioId");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20261104194414_InitialPostgres') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20261104194414_InitialPostgres', '8.0.11');
    END IF;
END $EF$;
COMMIT;

