import { ApiError, apiFetch, leerMensaje } from './apiClient';

export interface MovimientoCaja {
  id: string;
  tipo: 'Entrada' | 'Salida';
  monto: number;
  motivo: string;
  fechaHora: string;
}

export interface TurnoActivo {
  id: string;
  fechaApertura: string;
  fondoInicial: number;
  estado: string;
  cajero: string;
  ordenes: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ventasTransferencia: number;
  ventasMixto: number;
  totalEntradas: number;
  totalSalidas: number;
  efectivoEsperado: number;
  movimientos: MovimientoCaja[];
}

export interface CorteCaja {
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

const TURNO_KEY = 'pos.turno';

export function formatoFechaHora(valor: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}

export function guardarTurnoLocal(turno: TurnoActivo | null) {
  if (!turno) sessionStorage.removeItem(TURNO_KEY);
  else sessionStorage.setItem(TURNO_KEY, JSON.stringify(turno));
}

export function leerTurnoLocal(): TurnoActivo | null {
  const raw = sessionStorage.getItem(TURNO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TurnoActivo;
  } catch {
    return null;
  }
}

async function leerJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ApiError(await leerMensaje(response), response.status);
  return (await response.json()) as T;
}

export async function turnoActivo(): Promise<TurnoActivo | null> {
  try {
    const response = await apiFetch('/api/v1/caja/turnos/activo');
    if (response.status === 404) {
      guardarTurnoLocal(null);
      return null;
    }
    const turno = await leerJson<TurnoActivo>(response);
    guardarTurnoLocal(turno);
    return turno;
  } catch (error) {
    if (error instanceof TypeError) return leerTurnoLocal();
    throw error;
  }
}

export async function abrirTurno(fondoInicial: number) {
  const response = await apiFetch('/api/v1/caja/turnos/abrir', {
    method: 'POST',
    body: JSON.stringify({ fondoInicial }),
  });
  const turno = await leerJson<TurnoActivo>(response);
  guardarTurnoLocal(turno);
  return turno;
}

export async function registrarMovimiento(body: { tipo: 'Entrada' | 'Salida'; monto: number; motivo: string }) {
  const response = await apiFetch('/api/v1/caja/turnos/movimientos', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const turno = await leerJson<TurnoActivo>(response);
  guardarTurnoLocal(turno);
  return turno;
}

export async function cerrarTurno(body: { efectivoContado: number; observaciones: string }) {
  const response = await apiFetch('/api/v1/caja/turnos/cerrar', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const corte = await leerJson<CorteCaja>(response);
  guardarTurnoLocal(null);
  return corte;
}
