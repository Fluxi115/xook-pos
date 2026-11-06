import { toast } from 'sonner';
import {
  db,
  type CatalogoRemoto,
  type ModificadorSeleccionado,
  type SyncVentasResponse,
  type VentaItemPayload,
  type VentaPayload,
  type VentaPendiente,
} from '../db/db';
import { leerTurnoLocal } from './cajaApi';
import {
  apiFetch,
  ApiError,
  cerrarSesion,
  guardarSesion,
  leerMensaje,
  leerSesion,
  leerToken,
  type Sesion,
} from './apiClient';

interface LoginResponse {
  token: string;
  expiraUtc: string;
  usuarioId: string;
  tenantId: string;
  nombre: string;
  rol: string;
}

export interface LineaPorCobrar {
  productoId: string;
  cantidad: number;
  modificadores: { opcionId: string }[];
}

export interface VentaRegistrada {
  estado: 'sincronizada' | 'pendiente';
  subtotal: number;
  total: number;
  items: VentaItemPayload[];
}

export interface ResultadoSync {
  enviadas: number;
  sincronizadas: number;
  rechazadas: number;
  pendientes: number;
}

const sinEnvio: ResultadoSync = { enviadas: 0, sincronizadas: 0, rechazadas: 0, pendientes: 0 };

let colaEnCurso: Promise<ResultadoSync> | null = null;

export function esReintento(venta: VentaPendiente, usuarioId: string) {
  return !venta.sincronizado && venta.estado !== 'rechazada' && venta.usuarioId === usuarioId;
}

function redondear(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function bloqueaCierre(venta: VentaPendiente, usuarioId: string, turnoCajaId: string) {
  return !venta.sincronizado && venta.estado !== 'rechazada' && venta.usuarioId === usuarioId && venta.turnoCajaId === turnoCajaId;
}

export async function iniciarSesion(username: string, password: string): Promise<Sesion> {
  const response = await apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new ApiError(await leerMensaje(response), response.status);
  }

  const data = (await response.json()) as LoginResponse;
  const sesion: Sesion = {
    token: data.token,
    nombre: data.nombre,
    rol: data.rol,
    tenantId: data.tenantId,
    usuarioId: data.usuarioId,
    expiraUtc: data.expiraUtc,
  };
  guardarSesion(sesion);
  if (sesion.rol === 'SuperAdmin') return sesion;

  try {
    await descargarCatalogo();
    await sincronizarVentasPendientes();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      cerrarSesion();
      throw error;
    }
  }
  return sesion;
}

export async function descargarCatalogo(): Promise<void> {
  const response = await apiFetch('/api/v1/catalogo');
  if (!response.ok) {
    throw new ApiError(await leerMensaje(response), response.status);
  }

  const data = (await response.json()) as CatalogoRemoto;
  await db.transaction('rw', [db.tenantInfo, db.categorias, db.productos], async () => {
    await db.tenantInfo.clear();
    await db.categorias.clear();
    await db.productos.clear();
    await db.tenantInfo.put(data.tenant);
    if (data.categorias.length > 0) await db.categorias.bulkPut(data.categorias);
    if (data.productos.length > 0) await db.productos.bulkPut(data.productos);
  });
}

export async function cotizarDesdeCatalogo(lineas: LineaPorCobrar[], tasa = 0) {
  if (lineas.length === 0) throw new Error('El pedido está vacío.');
  const items: VentaItemPayload[] = [];

  for (const linea of lineas) {
    const producto = await db.productos.get(linea.productoId);
    if (!producto) throw new Error('Un producto ya no está en el menú de esta caja.');
    if (!producto.disponible) throw new Error(`${producto.nombre} está agotado.`);
    if (linea.cantidad < 1 || linea.cantidad > 999) throw new Error('La cantidad debe estar entre 1 y 999.');

    const opciones = new Map(producto.modificadores.flatMap((grupo) => grupo.opciones.map((opcion) => [opcion.id, opcion] as const)));
    const modificadores: ModificadorSeleccionado[] = [];
    for (const extra of linea.modificadores) {
      const opcion = opciones.get(extra.opcionId);
      if (!opcion) throw new Error(`Un complemento de ${producto.nombre} ya no está en el menú.`);
      modificadores.push({ opcionId: opcion.id, nombre: opcion.nombre, precioAdicional: opcion.precioAdicional });
    }

    const precioCatalogo = producto.precioBase;
    const precioUnitario = redondear(precioCatalogo + modificadores.reduce((suma, extra) => suma + extra.precioAdicional, 0));
    items.push({
      productoId: producto.id,
      nombreProducto: producto.nombre,
      cantidad: linea.cantidad,
      precioCatalogo,
      precioUnitario,
      totalLinea: redondear(precioUnitario * linea.cantidad),
      modificadores,
    });
  }

  const subtotal = redondear(items.reduce((suma, item) => suma + item.totalLinea, 0));
  const impuestos = redondear(subtotal * tasa);
  return { items, subtotal, total: redondear(subtotal + impuestos) };
}

export async function registrarVenta(entrada: {
  id: string;
  folioVenta: string;
  fechaHora: string;
  metodoPago: VentaPayload['metodoPago'];
  lineas: LineaPorCobrar[];
}): Promise<VentaRegistrada> {
  const sesion = leerSesion();
  if (!sesion) throw new Error('No hay una sesión activa.');
  const turno = leerTurnoLocal();
  if (!turno?.id) throw new Error('Abre un turno de caja antes de vender.');

  const sucursal = (await db.tenantInfo.toArray())[0];
  const cotizacion = await cotizarDesdeCatalogo(entrada.lineas, sucursal?.tasaImpuesto ?? 0);
  const payload: VentaPayload = {
    id: entrada.id,
    folioVenta: entrada.folioVenta,
    fechaHora: entrada.fechaHora,
    tenantId: sesion.tenantId,
    usuarioId: sesion.usuarioId,
    turnoCajaId: turno.id,
    subtotal: cotizacion.subtotal,
    total: cotizacion.total,
    metodoPago: entrada.metodoPago,
    items: cotizacion.items,
  };

  await db.ventasPendientes.put({
    id: payload.id,
    fechaHora: payload.fechaHora,
    total: payload.total,
    metodoPago: payload.metodoPago,
    tenantId: sesion.tenantId,
    usuarioId: sesion.usuarioId,
    turnoCajaId: turno.id,
    payloadCompleto: payload,
    sincronizado: false,
    estado: 'pendiente',
    error: null,
  });

  if (!navigator.onLine) {
    return { estado: 'pendiente', subtotal: payload.subtotal, total: payload.total, items: payload.items };
  }

  try {
    await sincronizarVentasPendientes();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new ApiError('La sesión expiró. La venta quedó guardada en este dispositivo.', 401);
    }
    return { estado: 'pendiente', subtotal: payload.subtotal, total: payload.total, items: payload.items };
  }

  const guardada = await db.ventasPendientes.get(payload.id);
  if (guardada?.estado === 'rechazada') {
    throw new Error(guardada.error ?? 'El servidor rechazó la venta.');
  }
  return {
    estado: guardada?.sincronizado ? 'sincronizada' : 'pendiente',
    subtotal: payload.subtotal,
    total: payload.total,
    items: payload.items,
  };
}

export function sincronizarVentasPendientes(avisar = true): Promise<ResultadoSync> {
  if (!navigator.onLine || !leerToken()) return Promise.resolve(sinEnvio);
  const tarea =
    colaEnCurso ??
    ejecutarCola(avisar).finally(() => {
      colaEnCurso = null;
    });
  colaEnCurso = tarea;
  return tarea;
}

async function depurarColaIncompleta() {
  const abiertas = await db.ventasPendientes.filter((venta) => !venta.sincronizado && venta.estado !== 'rechazada').toArray();
  let rechazadas = 0;
  for (const venta of abiertas) {
    const tenantId = venta.tenantId || venta.payloadCompleto?.tenantId;
    const usuarioId = venta.usuarioId || venta.payloadCompleto?.usuarioId;
    const turnoCajaId = venta.turnoCajaId || venta.payloadCompleto?.turnoCajaId;
    if (tenantId && usuarioId && turnoCajaId) continue;
    await db.ventasPendientes.update(venta.id, {
      estado: 'rechazada',
      error: 'La venta no tiene sucursal, usuario o turno y no se reintentará.',
    });
    rechazadas += 1;
  }
  if (rechazadas > 0) {
    toast.error(
      rechazadas === 1
        ? 'Una venta quedó rechazada porque no tiene turno o sucursal.'
        : `${rechazadas} ventas quedaron rechazadas porque no tienen turno o sucursal.`,
    );
  }
}

async function marcarRechazadas(ventas: VentaPendiente[], mensaje: string, avisar: boolean) {
  await Promise.all(
    ventas.map((venta) =>
      db.ventasPendientes.update(venta.id, {
        estado: 'rechazada',
        error: mensaje,
        sincronizado: false,
      }),
    ),
  );
  if (avisar && ventas.length > 0) toast.error(mensaje);
}

async function ejecutarCola(avisar: boolean): Promise<ResultadoSync> {
  await depurarColaIncompleta();
  const sesion = leerSesion();
  if (!sesion) return sinEnvio;

  const pendientes = await db.ventasPendientes
    .filter(
      (venta) =>
        !venta.sincronizado &&
        venta.estado !== 'rechazada' &&
        venta.tenantId === sesion.tenantId &&
        venta.usuarioId === sesion.usuarioId &&
        Boolean(venta.turnoCajaId),
    )
    .toArray();
  if (pendientes.length === 0) return sinEnvio;

  const response = await apiFetch('/api/v1/ventas/sync', {
    method: 'POST',
    body: JSON.stringify({ ventas: pendientes.map((venta) => venta.payloadCompleto) }),
  });

  if (!response.ok) {
    const mensaje = await leerMensaje(response);
    if (response.status === 400) {
      await marcarRechazadas(pendientes, mensaje, avisar);
      return { enviadas: pendientes.length, sincronizadas: 0, rechazadas: pendientes.length, pendientes: 0 };
    }
    throw new ApiError(mensaje, response.status);
  }

  const data = (await response.json()) as SyncVentasResponse;
  const sincronizados = new Set(data.idsSincronizados);
  const errores = new Map(data.errores.map((error) => [error.id, error]));

  await Promise.all(
    pendientes.map((venta) => {
      const error = errores.get(venta.id);
      if (error && error.definitivo !== false) {
        return db.ventasPendientes.update(venta.id, {
          estado: 'rechazada',
          error: error.mensaje,
          sincronizado: false,
        });
      }
      if (sincronizados.has(venta.id)) {
        return db.ventasPendientes.update(venta.id, { sincronizado: true, estado: 'sincronizada', error: null });
      }
      return Promise.resolve(0);
    }),
  );

  const rechazadas = data.errores.filter((error) => error.definitivo !== false);
  if (avisar && rechazadas.length === 1) toast.error(rechazadas[0].mensaje);
  else if (avisar && rechazadas.length > 1) {
    toast.error(`${rechazadas.length} ventas fueron rechazadas. El cierre Z puede continuar.`);
  }

  const sincronizadas = pendientes.filter((venta) => sincronizados.has(venta.id)).length;
  return {
    enviadas: pendientes.length,
    sincronizadas,
    rechazadas: rechazadas.length,
    pendientes: Math.max(0, pendientes.length - sincronizadas - rechazadas.length),
  };
}

export function iniciarColaSincronizacion() {
  const alVolver = () => {
    void sincronizarVentasPendientes();
  };

  window.addEventListener('online', alVolver);
  alVolver();

  return () => window.removeEventListener('online', alVolver);
}
