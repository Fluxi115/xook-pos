import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { MetodoPago, VentaItemPayload } from '../../db/db';
import { ApiError } from '../../services/apiClient';
import { cotizarDesdeCatalogo, registrarVenta } from '../../services/syncService';
import { MARCA } from '../../marca';
import { BILLETES, moneda, redondear, totalesDe, type LineaPedido } from './pedido';
import { Spinner } from './Spinner';

const METODOS: MetodoPago[] = ['Efectivo', 'Tarjeta', 'Transferencia'];

function datosDeTicket() {
  const ahora = new Date();
  return {
    folio: `T${ahora.getTime().toString(36).toUpperCase()}`,
    fechaHora: ahora.toISOString(),
  };
}

const fechaTicket = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short',
});

interface Recibo {
  folio: string;
  fechaHora: string;
  metodoPago: MetodoPago;
  recibido: number | null;
  cambio: number | null;
  subtotal: number;
  impuestos: number;
  total: number;
  lineas: VentaItemPayload[];
}

interface PaymentModalProps {
  lineas: LineaPedido[];
  nombreNegocio: string;
  cajero: string;
  onCerrar: () => void;
  onVentaRegistrada: () => void;
}

export function PaymentModal({ lineas, nombreNegocio, cajero, onCerrar, onVentaRegistrada }: PaymentModalProps) {
  const [pedido] = useState(lineas);
  const [metodo, setMetodo] = useState<MetodoPago>('Efectivo');
  const [recibido, setRecibido] = useState('');
  const [guardando, setGuardando] = useState(false);
  const enviando = useRef(false);
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const { impuestos, total } = totalesDe(pedido);

  const recibidoNumero = Number(recibido);
  const recibidoValido = recibido.trim() !== '' && Number.isFinite(recibidoNumero) && recibidoNumero >= 0;
  const cambio = metodo === 'Efectivo' && recibidoValido ? redondear(recibidoNumero - total) : null;
  const puedeCobrar = metodo !== 'Efectivo' || (cambio !== null && cambio >= 0);

  function sumarBillete(billete: number) {
    const actual = Number(recibido);
    const base = Number.isFinite(actual) && recibido.trim() !== '' ? actual : 0;
    setRecibido(String(redondear(base + billete)));
  }

  async function completar() {
    if (!puedeCobrar || enviando.current) return;
    enviando.current = true;
    setGuardando(true);
    const { folio, fechaHora } = datosDeTicket();
    try {
      const cotizacion = await cotizarDesdeCatalogo(
        pedido.map((linea) => ({
          productoId: linea.productoId,
          cantidad: linea.cantidad,
          modificadores: linea.modificadores,
        })),
      );
      if (Math.abs(cotizacion.total - total) > 0.009) {
        toast.error(`El precio del menú cambió. El total ahora es ${moneda.format(cotizacion.total)}.`);
        return;
      }
      const resultado = await registrarVenta({
        id: crypto.randomUUID(),
        folioVenta: folio,
        fechaHora,
        metodoPago: metodo,
        lineas: pedido.map((linea) => ({
          productoId: linea.productoId,
          cantidad: linea.cantidad,
          modificadores: linea.modificadores,
        })),
      });
      onVentaRegistrada();
      setRecibo({
        folio,
        fechaHora,
        metodoPago: metodo,
        recibido: metodo === 'Efectivo' && recibidoValido ? recibidoNumero : null,
        cambio: metodo === 'Efectivo' ? cambio : null,
        subtotal: resultado.subtotal,
        impuestos,
        total: resultado.total,
        lineas: resultado.items,
      });
      if (!navigator.onLine) toast.warning('Sin conexión: Venta guardada de forma segura en el dispositivo');
      else toast.success('Venta cobrada correctamente (Guardada localmente)');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        toast.error(caught.message);
        return;
      }
      toast.error(caught instanceof Error ? caught.message : 'No se pudo registrar la venta.');
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 md:items-center" role="dialog" aria-modal="true" aria-labelledby="titulo-cobro">
      <div className="flex max-h-[94dvh] w-full flex-col overflow-y-auto rounded-t-3xl bg-panel p-4 md:max-w-xl md:rounded-3xl md:p-6">
        {recibo ? (
          <>
            <article className="ticket-impresion mx-auto w-full max-w-sm rounded-2xl bg-cream px-4 py-5 text-ink">
              <p className="text-center text-xs font-semibold tracking-[0.14em]">{MARCA}</p>
              <p className="mt-1 text-center text-lg font-semibold">{nombreNegocio}</p>
              <p className="text-center text-sm">Folio {recibo.folio}</p>
              <p className="text-center text-sm">{fechaTicket.format(new Date(recibo.fechaHora))}</p>
              <p className="text-center text-sm">Atendió {cajero}</p>
              <div className="my-3 border-t border-dashed border-ink/30" />
              {recibo.lineas.map((linea, indice) => (
                <div key={`${linea.productoId}-${indice}`} className="mb-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span>
                      {linea.cantidad} × {linea.nombreProducto}
                    </span>
                    <span>{moneda.format(linea.totalLinea)}</span>
                  </div>
                  {linea.modificadores.length > 0 && (
                    <p className="text-xs opacity-70">{linea.modificadores.map((extra) => extra.nombre).join(', ')}</p>
                  )}
                </div>
              ))}
              <div className="my-3 border-t border-dashed border-ink/30" />
              <Fila etiqueta="Subtotal" valor={moneda.format(recibo.subtotal)} />
              <Fila etiqueta="Impuestos" valor={moneda.format(recibo.impuestos)} />
              <div className="mt-1 flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{moneda.format(recibo.total)}</span>
              </div>
              <p className="mt-2 text-sm">Pago: {recibo.metodoPago}</p>
              {recibo.recibido !== null && <Fila etiqueta="Recibido" valor={moneda.format(recibo.recibido)} />}
              {recibo.cambio !== null && <Fila etiqueta="Cambio" valor={moneda.format(recibo.cambio)} />}
              <p className="mt-4 text-center text-sm">Gracias por su visita</p>
            </article>
            <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
              <button type="button" className="min-h-14 rounded-2xl border border-line text-base" onClick={() => window.print()}>
                Imprimir
              </button>
              <button type="button" className="min-h-14 rounded-2xl bg-amber text-base font-semibold text-ink" onClick={onCerrar}>
                Nueva venta
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="titulo-cobro" className="text-2xl font-semibold">
                  Cobrar
                </h2>
                <p className="text-sm text-muted">Total a pagar {moneda.format(total)}</p>
              </div>
              <button type="button" className="min-h-12 rounded-2xl px-3 text-sm text-muted" onClick={onCerrar}>
                Cerrar
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Método de pago">
              {METODOS.map((opcion) => (
                <button
                  key={opcion}
                  type="button"
                  role="radio"
                  aria-checked={metodo === opcion}
                  onClick={() => setMetodo(opcion)}
                  className={`min-h-16 rounded-2xl border text-base font-medium ${metodo === opcion ? 'border-amber bg-amber text-ink' : 'border-line'}`}
                >
                  {opcion}
                </button>
              ))}
            </div>
            {metodo === 'Efectivo' && (
              <div className="mt-5">
                <label className="text-sm text-muted" htmlFor="recibido">
                  Cantidad recibida
                </label>
                <input
                  id="recibido"
                  inputMode="decimal"
                  value={recibido}
                  onChange={(event) => setRecibido(event.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="0.00"
                  className="mt-1 min-h-16 w-full rounded-2xl border border-line bg-ink px-4 text-3xl outline-none focus:border-amber"
                />
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {BILLETES.map((billete) => (
                    <button
                      key={billete}
                      type="button"
                      className="min-h-14 rounded-2xl border border-line text-base"
                      onClick={() => sumarBillete(billete)}
                    >
                      ${billete}
                    </button>
                  ))}
                </div>
                <p className={`mt-4 text-center text-3xl font-semibold ${cambio !== null && cambio < 0 ? 'text-chili' : 'text-leaf'}`}>
                  {cambio === null ? 'Cambio —' : cambio < 0 ? `Faltan ${moneda.format(Math.abs(cambio))}` : `Cambio ${moneda.format(cambio)}`}
                </p>
              </div>
            )}
            <button
              type="button"
              disabled={!puedeCobrar || guardando}
              onClick={() => void completar()}
              className="mt-5 inline-flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-amber text-lg font-semibold text-ink disabled:opacity-40"
            >
              {guardando ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Spinner />
                  Procesando...
                </span>
              ) : (
                'Completar venta'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span>{etiqueta}</span>
      <span>{valor}</span>
    </div>
  );
}
