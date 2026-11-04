import { ApiError, apiFetch, leerMensaje } from './apiClient';

export interface TenantAdmin {
  id: string;
  nombreComercial: string;
  rucRfc: string;
  telefono: string | null;
  logoUrl: string | null;
  estado: 'Activo' | 'Suspendido' | 'Inactivo';
  fechaVencimiento: string;
  totalUsuarios: number;
}

export type Semaforo = 'activo' | 'por-vencer' | 'bloqueado';

const CINCO_DIAS = 5 * 24 * 60 * 60 * 1000;

export function semaforo(tenant: TenantAdmin, ahora = Date.now()): Semaforo {
  const vence = new Date(tenant.fechaVencimiento).getTime();
  if (tenant.estado !== 'Activo' || vence <= ahora) return 'bloqueado';
  if (vence - ahora <= CINCO_DIAS) return 'por-vencer';
  return 'activo';
}

export function fechaInput(valor: Date) {
  return valor.toISOString().slice(0, 10);
}

export function finDeDiaUtc(fecha: string) {
  return new Date(`${fecha}T23:59:59.999Z`).toISOString();
}

export function sumarMeses(base: Date, meses: number) {
  const copia = new Date(base.getTime());
  copia.setUTCMonth(copia.getUTCMonth() + meses);
  return copia;
}

export function fechaInicial(meses: number) {
  return fechaInput(sumarMeses(new Date(), meses));
}

export function fechaDesdeHoy(dias: number) {
  return fechaInput(new Date(Date.now() + dias * 24 * 60 * 60 * 1000));
}

export function renovarDesde(fechaVencimiento: string, meses: number) {
  const actual = new Date(fechaVencimiento).getTime();
  const base = new Date(Math.max(Date.now(), Number.isNaN(actual) ? 0 : actual));
  return fechaInput(sumarMeses(base, meses));
}

async function leerJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ApiError(await leerMensaje(response), response.status);
  return (await response.json()) as T;
}

export function listarTenants() {
  return apiFetch('/api/v1/superadmin/tenants').then((response) => leerJson<TenantAdmin[]>(response));
}

export function crearTenant(body: {
  nombreComercial: string;
  rucRfc: string;
  telefono: string;
  logoUrl: string;
  fechaVencimiento: string;
  adminNombre: string;
  adminUsername: string;
  adminPassword: string;
}) {
  return apiFetch('/api/v1/superadmin/tenants', { method: 'POST', body: JSON.stringify(body) }).then((response) =>
    leerJson<TenantAdmin>(response),
  );
}

export function editarTenant(id: string, body: { nombreComercial: string; rucRfc: string; telefono: string; logoUrl: string }) {
  return apiFetch(`/api/v1/superadmin/tenants/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then((response) =>
    leerJson<TenantAdmin>(response),
  );
}

export function actualizarSuscripcion(id: string, body: { fechaVencimiento: string; estado: TenantAdmin['estado'] }) {
  return apiFetch(`/api/v1/superadmin/tenants/${id}/suscripcion`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }).then((response) => leerJson<TenantAdmin>(response));
}
