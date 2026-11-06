import type { ModificadorSeleccionado } from '../../db/db';

export const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const TASA_IMPUESTO = 0;

export const BILLETES = [50, 100, 200, 500] as const;

export interface LineaPedido {
  key: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  modificadores: ModificadorSeleccionado[];
}

export function redondear(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function precioConExtras(precioBase: number, modificadores: ModificadorSeleccionado[]) {
  return redondear(precioBase + modificadores.reduce((suma, extra) => suma + extra.precioAdicional, 0));
}

export function totalesDe(lineas: LineaPedido[], tasa = TASA_IMPUESTO) {
  const subtotal = redondear(lineas.reduce((suma, linea) => suma + linea.precioUnitario * linea.cantidad, 0));
  const impuestos = redondear(subtotal * tasa);
  const total = redondear(subtotal + impuestos);
  return { subtotal, impuestos, total };
}

export function piezasDe(lineas: LineaPedido[]) {
  return lineas.reduce((suma, linea) => suma + linea.cantidad, 0);
}
