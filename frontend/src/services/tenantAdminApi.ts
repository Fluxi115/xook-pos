import { ApiError, apiFetch, leerMensaje } from './apiClient';

export interface DashboardAdmin {
  nombreComercial: string;
  logoUrl: string | null;
  ventasDelDia: number;
  ordenesDelDia: number;
  ticketPromedio: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  mixto: number;
  maxCajas: number;
  maxMeseros: number;
  ultimasVentas: VentaResumen[];
}

export interface VentaResumen {
  id: string;
  folioVenta: string;
  fechaHora: string;
  total: number;
  metodoPago: string;
  cajero: string;
  cancelada: boolean;
  motivoCancelacion: string | null;
  fechaCancelacion: string | null;
}

export interface ProductoAdmin {
  id: string;
  categoriaId: string;
  categoriaNombre: string;
  nombre: string;
  descripcion: string | null;
  precioBase: number;
  fotoUrl: string | null;
  disponible: boolean;
  grupos: { id: string; nombre: string }[];
}

export interface CategoriaAdmin {
  id: string;
  nombre: string;
  orden: number;
}

export interface GrupoAdmin {
  id: string;
  nombre: string;
  esObligatorio: boolean;
  seleccionMaxima: number;
}

export interface UsuarioSucursal {
  id: string;
  nombre: string;
  username: string;
  rol: 'Cajero' | 'Mesero';
  activo: boolean;
}

export interface GuardarProducto {
  nombre: string;
  descripcion: string;
  categoriaId: string;
  precioBase: number;
  fotoUrl: string;
  disponible: boolean;
  gruposModificadorIds: string[];
}

export function formatoFechaHora(valor: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}

async function leerJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ApiError(await leerMensaje(response), response.status);
  return (await response.json()) as T;
}

export function metricasSucursal() {
  return apiFetch('/api/v1/tenant-admin/dashboard/metrics').then((response) => leerJson<DashboardAdmin>(response));
}

export function listarProductosAdmin() {
  return apiFetch('/api/v1/tenant-admin/productos').then((response) => leerJson<ProductoAdmin[]>(response));
}

export function listarCategoriasAdmin() {
  return apiFetch('/api/v1/tenant-admin/categorias').then((response) => leerJson<CategoriaAdmin[]>(response));
}

export function listarModificadoresAdmin() {
  return apiFetch('/api/v1/tenant-admin/modificadores').then((response) => leerJson<GrupoAdmin[]>(response));
}

export function crearProductoAdmin(body: GuardarProducto) {
  return apiFetch('/api/v1/tenant-admin/productos', { method: 'POST', body: JSON.stringify(body) }).then((response) =>
    leerJson<ProductoAdmin>(response),
  );
}

export function editarProductoAdmin(id: string, body: GuardarProducto) {
  return apiFetch(`/api/v1/tenant-admin/productos/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then((response) =>
    leerJson<ProductoAdmin>(response),
  );
}

export async function eliminarProductoAdmin(id: string) {
  const response = await apiFetch(`/api/v1/tenant-admin/productos/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new ApiError(await leerMensaje(response), response.status);
}

export function listarPersonal() {
  return apiFetch('/api/v1/tenant-admin/usuarios').then((response) => leerJson<UsuarioSucursal[]>(response));
}

export interface CorteAdmin {
  id: string;
  turnoCajaId: string;
  fechaCorte: string;
  cajero: string;
  ordenes: number;
  totalVentasEfectivo: number;
  totalVentasTarjeta: number;
  totalVentasTransferencia: number;
  totalVentasMixto: number;
  fondoInicial: number;
  totalEntradas: number;
  totalSalidas: number;
  efectivoEsperado: number;
  efectivoContado: number;
  diferencia: number;
  observaciones: string | null;
}

export function listarCortes() {
  return apiFetch('/api/v1/tenant-admin/cortes').then((response) => leerJson<CorteAdmin[]>(response));
}

export type PeriodoReporte = 'dia' | 'semana' | 'mes';

export interface ProductoReporte {
  nombre: string;
  cantidad: number;
  total: number;
}

export interface ReporteSucursal {
  periodo: PeriodoReporte;
  desde: string;
  hasta: string;
  ventas: number;
  ordenes: number;
  ticketPromedio: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  productos: ProductoReporte[];
  movimientos: VentaResumen[];
}

export interface TicketSucursal {
  direccion: string | null;
  telefono: string | null;
  mensajeTicket: string | null;
  tasaImpuesto: number;
}

export function reporteSucursal(periodo: PeriodoReporte) {
  return apiFetch(`/api/v1/tenant-admin/reportes?periodo=${periodo}`).then((response) => leerJson<ReporteSucursal>(response));
}

export function cancelarVenta(id: string, motivo: string) {
  return apiFetch(`/api/v1/tenant-admin/ventas/${id}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  }).then((response) => leerJson<VentaResumen>(response));
}

export function leerTicket() {
  return apiFetch('/api/v1/tenant-admin/ticket').then((response) => leerJson<TicketSucursal>(response));
}

export function guardarTicket(body: TicketSucursal) {
  return apiFetch('/api/v1/tenant-admin/ticket', { method: 'PUT', body: JSON.stringify(body) }).then((response) =>
    leerJson<TicketSucursal>(response),
  );
}

export function crearPersonal(body: { nombre: string; username: string; password: string; rol: 'Cajero' | 'Mesero' }) {
  return apiFetch('/api/v1/tenant-admin/usuarios', { method: 'POST', body: JSON.stringify(body) }).then((response) =>
    leerJson<UsuarioSucursal>(response),
  );
}
