-- Datos de prueba. Ejecutar después de supabase-esquema.sql.
-- Usuarios: admin, cajero y superadmin. Contraseña: Admin123!
-- Cámbiala en cuanto entres; la API es pública.

INSERT INTO tenants (
    "Id", "NombreComercial", "RucRfc", "Estado", "FechaVencimiento", "FechaCreacion"
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Taquería del Centro',
    'XAXX010101000',
    'Activo',
    NOW() + INTERVAL '1 year',
    NOW()
) ON CONFLICT ("Id") DO NOTHING;

INSERT INTO usuarios (
    "Id", "Nombre", "Username", "PasswordHash", "Rol", "Activo", "TenantId"
) VALUES
    (
        '22222222-2222-2222-2222-222222222222',
        'Administrador',
        'admin',
        '$2a$11$ouoJi5B15oaZmqf8ooZIneDN8JqVTQqIhb7g7DAhnSnCQ3Ktai1j.',
        'AdminSucursal',
        TRUE,
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'Caja 1',
        'cajero',
        '$2a$11$ouoJi5B15oaZmqf8ooZIneDN8JqVTQqIhb7g7DAhnSnCQ3Ktai1j.',
        'Cajero',
        TRUE,
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'Super administrador',
        'superadmin',
        '$2a$11$ouoJi5B15oaZmqf8ooZIneDN8JqVTQqIhb7g7DAhnSnCQ3Ktai1j.',
        'SuperAdmin',
        TRUE,
        '11111111-1111-1111-1111-111111111111'
    )
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO categorias ("Id", "Nombre", "Orden", "TenantId") VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', 'Tacos', 1, '11111111-1111-1111-1111-111111111111'),
    ('aaaaaaaa-0000-0000-0000-000000000002', 'Bebidas', 2, '11111111-1111-1111-1111-111111111111')
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO productos (
    "Id", "CategoriaId", "Nombre", "Descripcion", "PrecioBase", "Disponible", "TenantId"
) VALUES
    (
        'bbbbbbbb-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'Taco de pastor',
        'Cerdo adobado con piña',
        28.00,
        TRUE,
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        'bbbbbbbb-0000-0000-0000-000000000002',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'Taco de suadero',
        'Suadero a la plancha',
        30.00,
        TRUE,
        '11111111-1111-1111-1111-111111111111'
    ),
    (
        'bbbbbbbb-0000-0000-0000-000000000003',
        'aaaaaaaa-0000-0000-0000-000000000002',
        'Agua de horchata',
        'Vaso preparado al momento',
        22.00,
        TRUE,
        '11111111-1111-1111-1111-111111111111'
    )
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO grupos_modificador (
    "Id", "Nombre", "EsObligatorio", "SeleccionMaxima", "TenantId"
) VALUES
    ('cccccccc-0000-0000-0000-000000000001', 'Complementos', FALSE, 3, '11111111-1111-1111-1111-111111111111'),
    ('cccccccc-0000-0000-0000-000000000002', 'Tamaño', TRUE, 1, '11111111-1111-1111-1111-111111111111')
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO opciones_modificador (
    "Id", "GrupoModificadorId", "Nombre", "PrecioAdicional", "TenantId"
) VALUES
    ('cccccccc-0000-0000-0000-000000000011', 'cccccccc-0000-0000-0000-000000000001', 'Queso extra', 15.00, '11111111-1111-1111-1111-111111111111'),
    ('cccccccc-0000-0000-0000-000000000012', 'cccccccc-0000-0000-0000-000000000001', 'Sin cebolla', 0.00, '11111111-1111-1111-1111-111111111111'),
    ('cccccccc-0000-0000-0000-000000000013', 'cccccccc-0000-0000-0000-000000000001', 'Piña', 0.00, '11111111-1111-1111-1111-111111111111'),
    ('cccccccc-0000-0000-0000-000000000021', 'cccccccc-0000-0000-0000-000000000002', 'Chico', 0.00, '11111111-1111-1111-1111-111111111111'),
    ('cccccccc-0000-0000-0000-000000000022', 'cccccccc-0000-0000-0000-000000000002', 'Grande', 10.00, '11111111-1111-1111-1111-111111111111')
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO productos_modificador (
    "Id", "ProductoId", "GrupoModificadorId", "TenantId"
) VALUES
    ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
    ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
    ('dddddddd-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111')
ON CONFLICT ("Id") DO NOTHING;
