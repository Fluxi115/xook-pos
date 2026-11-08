import { ApiError, apiFetch, leerMensaje } from './apiClient';

export interface SucursalEmpresa {
  id: string;
  nombreComercial: string;
  codigo: string;
  slug: string;
  parentSucursalId: string | null;
  parentNombre: string | null;
  fechaVencimiento: string;
}

export interface EmpresaPanel {
  id: string;
  nombre: string;
  slug: string;
  sucursales: SucursalEmpresa[];
}

export interface UsuarioCreado {
  id: string;
  nombre: string;
  username: string;
  rol: string;
  sucursalId: string;
}

async function leerJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new ApiError(await leerMensaje(response), response.status);
  return (await response.json()) as T;
}

export function leerEmpresa() {
  return apiFetch('/api/v1/empresa').then((response) => leerJson<EmpresaPanel>(response));
}

export function crearSucursalEmpresa(body: { nombreComercial: string; codigo: string; parentSucursalId?: string; telefono?: string }) {
  return apiFetch('/api/v1/empresa/sucursales', { method: 'POST', body: JSON.stringify(body) }).then((response) =>
    leerJson<SucursalEmpresa>(response),
  );
}

export function crearGerente(sucursalId: string, body: { nombre: string; password: string }) {
  return apiFetch(`/api/v1/empresa/sucursales/${sucursalId}/gerentes`, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((response) => leerJson<UsuarioCreado>(response));
}
