export interface Sesion {
  token: string;
  nombre: string;
  rol: string;
  tenantId: string;
  usuarioId: string;
  expiraUtc: string;
}

const SESION_KEY = 'pos.sesion';

type OyenteSesion = (sesion: Sesion | null) => void;

const oyentes = new Set<OyenteSesion>();

export function observarSesion(oyente: OyenteSesion) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function publicarSesion(sesion: Sesion | null) {
  for (const oyente of oyentes) oyente(sesion);
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function guardarSesion(sesion: Sesion) {
  localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
  publicarSesion(sesion);
}

export function leerSesion(): Sesion | null {
  const raw = localStorage.getItem(SESION_KEY);
  if (!raw) return null;
  try {
    const sesion = JSON.parse(raw) as Sesion;
    const expira = Date.parse(sesion.expiraUtc);
    if (!sesion.token || !sesion.usuarioId || !sesion.tenantId || Number.isNaN(expira) || expira <= Date.now()) {
      cerrarSesion();
      return null;
    }
    return sesion;
  } catch {
    cerrarSesion();
    return null;
  }
}

export function cerrarSesion() {
  localStorage.clear();
  sessionStorage.clear();
  publicarSesion(null);
}

export function leerToken() {
  return leerSesion()?.token ?? null;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = leerToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5080';
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (response.status === 401 && token && !path.includes('/auth/login')) {
    cerrarSesion();
  }
  return response;
}

export async function leerMensaje(response: Response) {
  try {
    const data = (await response.json()) as { mensaje?: string };
    return data.mensaje ?? `Error ${response.status}`;
  } catch {
    return `Error ${response.status}`;
  }
}
