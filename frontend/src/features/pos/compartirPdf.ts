import { Capacitor } from '@capacitor/core';
import type { jsPDF } from 'jspdf';
import { MARCA } from '../../marca';
import { moneda } from './pedido';

const ANCHO = 80;
const MARGEN = 5;
const UTIL = ANCHO - MARGEN * 2;

const fechaTicket = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type Bloque =
  | { tipo: 'centro'; texto: string; tamano: number; negrita?: boolean }
  | { tipo: 'par'; izquierda: string; derecha: string; tamano: number; negrita?: boolean }
  | { tipo: 'texto'; texto: string; tamano: number }
  | { tipo: 'separador' };

export interface LineaReciboPdf {
  cantidad: number;
  nombreProducto: string;
  totalLinea: number;
  modificadores: { nombre: string }[];
}

export interface ReciboPdf {
  folio: string;
  fechaHora: string;
  metodoPago: string;
  recibido: number | null;
  cambio: number | null;
  subtotal: number;
  impuestos: number;
  total: number;
  lineas: LineaReciboPdf[];
  nombreNegocio: string;
  cajero: string;
  direccion?: string | null;
  telefono?: string | null;
  mensaje?: string | null;
}

export interface CortePdf {
  negocio: string;
  fechaCorte: string;
  cajero: string;
  fondoInicial: number;
  totalVentasEfectivo: number;
  totalVentasTarjeta: number;
  totalVentasTransferencia: number;
  totalEntradas: number;
  totalSalidas: number;
  efectivoEsperado: number;
  efectivoContado: number;
  diferencia: number;
  observaciones: string | null;
}

export function esAplicacionNativa() {
  return Capacitor.isNativePlatform();
}

export async function compartirReciboPdf(recibo: ReciboPdf) {
  const bloques: Bloque[] = [
    { tipo: 'centro', texto: MARCA, tamano: 9, negrita: true },
    { tipo: 'centro', texto: recibo.nombreNegocio, tamano: 13, negrita: true },
  ];
  if (recibo.direccion) bloques.push({ tipo: 'centro', texto: recibo.direccion, tamano: 8 });
  if (recibo.telefono) bloques.push({ tipo: 'centro', texto: recibo.telefono, tamano: 8 });
  bloques.push(
    { tipo: 'centro', texto: `Folio ${recibo.folio}`, tamano: 9 },
    { tipo: 'centro', texto: fechaTicket.format(new Date(recibo.fechaHora)), tamano: 9 },
    { tipo: 'centro', texto: `Atendió ${recibo.cajero}`, tamano: 9 },
    { tipo: 'separador' },
  );
  for (const linea of recibo.lineas) {
    bloques.push({
      tipo: 'par',
      izquierda: `${linea.cantidad} × ${linea.nombreProducto}`,
      derecha: dinero(linea.totalLinea),
      tamano: 9,
    });
    if (linea.modificadores.length > 0) {
      bloques.push({
        tipo: 'texto',
        texto: linea.modificadores.map((extra) => extra.nombre).join(', '),
        tamano: 8,
      });
    }
  }
  bloques.push(
    { tipo: 'separador' },
    { tipo: 'par', izquierda: 'Subtotal', derecha: dinero(recibo.subtotal), tamano: 9 },
    { tipo: 'par', izquierda: 'Impuestos', derecha: dinero(recibo.impuestos), tamano: 9 },
    { tipo: 'par', izquierda: 'Total', derecha: dinero(recibo.total), tamano: 12, negrita: true },
    { tipo: 'texto', texto: `Pago: ${recibo.metodoPago}`, tamano: 9 },
  );
  if (recibo.recibido !== null) bloques.push({ tipo: 'par', izquierda: 'Recibido', derecha: dinero(recibo.recibido), tamano: 9 });
  if (recibo.cambio !== null) bloques.push({ tipo: 'par', izquierda: 'Cambio', derecha: dinero(recibo.cambio), tamano: 9 });
  if (recibo.mensaje) bloques.push({ tipo: 'centro', texto: recibo.mensaje, tamano: 8 });
  bloques.push({ tipo: 'centro', texto: 'Gracias por su visita', tamano: 9 });
  await compartir(`recibo-${recibo.folio}.pdf`, `Recibo ${recibo.folio}`, bloques);
}

export async function compartirCortePdf(corte: CortePdf) {
  const bloques: Bloque[] = [
    { tipo: 'centro', texto: MARCA, tamano: 9, negrita: true },
    { tipo: 'centro', texto: 'Cierre Z', tamano: 11, negrita: true },
    { tipo: 'centro', texto: corte.negocio, tamano: 13, negrita: true },
    { tipo: 'centro', texto: fechaTicket.format(new Date(corte.fechaCorte)), tamano: 9 },
    { tipo: 'centro', texto: corte.cajero, tamano: 9 },
    { tipo: 'separador' },
    { tipo: 'par', izquierda: 'Fondo', derecha: dinero(corte.fondoInicial), tamano: 9 },
    { tipo: 'par', izquierda: 'Efectivo', derecha: dinero(corte.totalVentasEfectivo), tamano: 9 },
    { tipo: 'par', izquierda: 'Tarjeta', derecha: dinero(corte.totalVentasTarjeta), tamano: 9 },
    { tipo: 'par', izquierda: 'Transferencia', derecha: dinero(corte.totalVentasTransferencia), tamano: 9 },
    { tipo: 'par', izquierda: 'Entradas', derecha: dinero(corte.totalEntradas), tamano: 9 },
    { tipo: 'par', izquierda: 'Salidas', derecha: dinero(corte.totalSalidas), tamano: 9 },
    { tipo: 'par', izquierda: 'Esperado', derecha: dinero(corte.efectivoEsperado), tamano: 9 },
    { tipo: 'par', izquierda: 'Contado', derecha: dinero(corte.efectivoContado), tamano: 9 },
    { tipo: 'par', izquierda: 'Diferencia', derecha: dinero(corte.diferencia), tamano: 11, negrita: true },
  ];
  if (corte.observaciones) bloques.push({ tipo: 'texto', texto: corte.observaciones, tamano: 9 });
  await compartir(`cierre-${fechaArchivo(corte.fechaCorte)}.pdf`, 'Cierre Z', bloques);
}

async function compartir(nombreArchivo: string, titulo: string, bloques: Bloque[]) {
  const { Directory, Filesystem } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const base64 = await pdfBase64(bloques);
  await Filesystem.writeFile({
    path: nombreArchivo,
    data: base64,
    directory: Directory.Cache,
  });
  const archivo = await Filesystem.getUri({
    path: nombreArchivo,
    directory: Directory.Cache,
  });
  try {
    await Share.share({
      title: titulo,
      files: [archivo.uri],
      dialogTitle: 'Compartir PDF',
    });
  } catch (error) {
    if (compartirCancelado(error)) return;
    throw error;
  }
}

async function pdfBase64(bloques: Bloque[]) {
  const { jsPDF } = await import('jspdf');
  const medida = new jsPDF({ unit: 'mm', format: [ANCHO, 200], compress: true });
  let alto = MARGEN;
  for (const bloque of bloques) alto += altoBloque(medida, bloque);
  alto += MARGEN;
  const doc = new jsPDF({ unit: 'mm', format: [ANCHO, Math.max(48, alto)], compress: true });
  doc.setTextColor(16, 20, 24);
  let y = MARGEN;
  for (const bloque of bloques) y = dibujar(doc, bloque, y);
  const uri = doc.output('datauristring');
  return uri.slice(uri.indexOf(',') + 1);
}

function altoBloque(doc: jsPDF, bloque: Bloque) {
  if (bloque.tipo === 'separador') return 4;
  preparar(doc, bloque);
  if (bloque.tipo === 'par') return lineasPar(doc, bloque).length * salto(bloque.tamano) + 0.5;
  const texto = limpiar(bloque.texto);
  const lineas = doc.splitTextToSize(texto, UTIL) as string[];
  return Math.max(1, lineas.length) * salto(bloque.tamano) + 0.5;
}

function dibujar(doc: jsPDF, bloque: Bloque, y: number) {
  if (bloque.tipo === 'separador') {
    doc.setDrawColor(60);
    doc.setLineDashPattern([0.7, 0.7], 0);
    doc.line(MARGEN, y + 1.4, ANCHO - MARGEN, y + 1.4);
    doc.setLineDashPattern([], 0);
    return y + 4;
  }
  preparar(doc, bloque);
  const paso = salto(bloque.tamano);
  if (bloque.tipo === 'par') {
    const derecha = limpiar(bloque.derecha);
    const partes = lineasPar(doc, bloque);
    doc.text(partes, MARGEN, y + paso * 0.75);
    doc.text(derecha, ANCHO - MARGEN, y + paso * 0.75, { align: 'right' });
    return y + partes.length * paso + 0.5;
  }
  const lineas = doc.splitTextToSize(limpiar(bloque.texto), UTIL) as string[];
  const alineacion = bloque.tipo === 'centro' ? 'center' : 'left';
  const x = bloque.tipo === 'centro' ? ANCHO / 2 : MARGEN;
  doc.text(lineas, x, y + paso * 0.75, { align: alineacion });
  return y + lineas.length * paso + 0.5;
}

function lineasPar(doc: jsPDF, bloque: { izquierda: string; derecha: string }) {
  const anchoDerecha = doc.getTextWidth(limpiar(bloque.derecha)) + 2;
  return doc.splitTextToSize(limpiar(bloque.izquierda), Math.max(24, UTIL - anchoDerecha)) as string[];
}

function preparar(doc: jsPDF, bloque: Exclude<Bloque, { tipo: 'separador' }>) {
  const negrita = bloque.tipo !== 'texto' && bloque.negrita;
  doc.setFont('helvetica', negrita ? 'bold' : 'normal');
  doc.setFontSize(bloque.tamano);
}

function salto(tamano: number) {
  return tamano * 0.42;
}

function dinero(valor: number) {
  return limpiar(moneda.format(valor));
}

function limpiar(valor: string) {
  return valor.replace(/[\u202F\u00A0]/g, ' ');
}

function fechaArchivo(valor: string) {
  return valor.replace(/[:.]/g, '-');
}

function compartirCancelado(error: unknown) {
  const mensaje = error instanceof Error ? error.message : String(error);
  return /cancel/i.test(mensaje);
}
