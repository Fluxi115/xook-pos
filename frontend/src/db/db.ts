import Dexie, { type EntityTable } from 'dexie';

export type MetodoPago = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Mixto';

export const METODOS_PAGO: MetodoPago[] = ['Efectivo', 'Tarjeta', 'Transferencia', 'Mixto'];

export interface TenantInfo {
  id: string;
  nombreComercial: string;
  rucRfc: string;
  logoUrl: string | null;
  estado: string;
  fechaVencimiento: string;
  telefono?: string | null;
  direccion?: string | null;
  mensajeTicket?: string | null;
  tasaImpuesto?: number;
}

export interface CategoriaLocal {
  id: string;
  nombre: string;
  orden: number;
  iconoUrl?: string | null;
}

export interface OpcionModificadorLocal {
  id: string;
  nombre: string;
  precioAdicional: number;
}

export interface GrupoModificadorLocal {
  id: string;
  nombre: string;
  esObligatorio: boolean;
  seleccionMaxima: number;
  opciones: OpcionModificadorLocal[];
}

export interface ProductoLocal {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion?: string | null;
  precioBase: number;
  fotoUrl?: string | null;
  disponible: boolean;
  modificadores: GrupoModificadorLocal[];
}

export interface ModificadorSeleccionado {
  opcionId: string;
  nombre: string;
  precioAdicional: number;
}

export interface VentaItemPayload {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioCatalogo: number;
  precioUnitario: number;
  totalLinea: number;
  modificadores: ModificadorSeleccionado[];
}

export interface VentaPayload {
  id: string;
  folioVenta: string;
  fechaHora: string;
  tenantId: string;
  usuarioId: string;
  turnoCajaId: string;
  subtotal: number;
  total: number;
  metodoPago: MetodoPago;
  items: VentaItemPayload[];
}

export type EstadoColaVenta = 'pendiente' | 'sincronizada' | 'rechazada';

export interface VentaPendiente {
  id: string;
  fechaHora: string;
  total: number;
  metodoPago: MetodoPago;
  tenantId?: string;
  usuarioId?: string;
  turnoCajaId?: string;
  payloadCompleto: VentaPayload;
  sincronizado: boolean;
  estado?: EstadoColaVenta;
  error?: string | null;
}

export interface CatalogoRemoto {
  tenant: TenantInfo;
  categorias: CategoriaLocal[];
  productos: ProductoLocal[];
}

export interface SyncVentasResponse {
  recibidas: number;
  insertadas: number;
  omitidas: number;
  idsSincronizados: string[];
  errores: { id: string; mensaje: string; definitivo?: boolean }[];
}

class PosDatabase extends Dexie {
  tenantInfo!: EntityTable<TenantInfo, 'id'>;
  categorias!: EntityTable<CategoriaLocal, 'id'>;
  productos!: EntityTable<ProductoLocal, 'id'>;
  ventasPendientes!: EntityTable<VentaPendiente, 'id'>;

  constructor() {
    super('PosGastronomico');
    this.version(1).stores({
      tenantInfo: 'id',
      categorias: 'id, orden, nombre',
      productos: 'id, categoriaId, nombre',
      ventasPendientes: 'id, sincronizado, fechaHora',
    });
    this.version(2)
      .stores({
        tenantInfo: 'id',
        categorias: 'id, orden, nombre',
        productos: 'id, categoriaId, nombre',
        ventasPendientes: 'id, sincronizado, fechaHora, estado, tenantId, usuarioId, turnoCajaId',
      })
      .upgrade(async (transaccion) => {
        await transaccion
          .table('ventasPendientes')
          .toCollection()
          .modify((venta: VentaPendiente) => {
            venta.estado = venta.sincronizado ? 'sincronizada' : 'pendiente';
          });
      });
  }
}

export const db = new PosDatabase();
