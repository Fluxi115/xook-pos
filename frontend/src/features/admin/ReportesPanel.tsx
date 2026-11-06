import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { moneda } from '../pos/pedido';
import { ApiError } from '../../services/apiClient';
import {
  cancelarVenta,
  formatoFechaHora,
  reporteSucursal,
  type PeriodoReporte,
  type ReporteSucursal,
  type VentaResumen,
} from '../../services/tenantAdminApi';

const PERIODOS: { id: PeriodoReporte; etiqueta: string }[] = [
  { id: 'dia', etiqueta: 'Hoy' },
  { id: 'semana', etiqueta: 'Semana' },
  { id: 'mes', etiqueta: 'Mes' },
];

export function ReportesPanel() {
  const [periodo, setPeriodo] = useState<PeriodoReporte>('semana');
  const [reporte, setReporte] = useState<ReporteSucursal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [anular, setAnular] = useState<VentaResumen | null>(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError('');
    reporteSucursal(periodo)
      .then((datos) => {
        if (vigente) setReporte(datos);
      })
      .catch((caught: unknown) => {
        if (!vigente) return;
        setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el reporte.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [periodo]);

  async function recargar() {
    setReporte(await reporteSucursal(periodo));
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Reportes</h2>
        <div className="flex gap-2">
          {PERIODOS.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              onClick={() => setPeriodo(opcion.id)}
              className={`min-h-11 rounded-2xl px-4 ${periodo === opcion.id ? 'bg-amber font-semibold text-ink' : 'border border-line'}`}
            >
              {opcion.etiqueta}
            </button>
          ))}
        </div>
      </div>
      {cargando && <p className="mt-4 text-muted">Cargando el reporte…</p>}
      {error && <p className="mt-4 text-chili">{error}</p>}
      {reporte && !cargando && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Tarjeta etiqueta="Ventas" valor={moneda.format(reporte.ventas)} />
            <Tarjeta etiqueta="Órdenes" valor={String(reporte.ordenes)} />
            <Tarjeta etiqueta="Ticket promedio" valor={moneda.format(reporte.ticketPromedio)} />
            <Tarjeta etiqueta="Efectivo" valor={moneda.format(reporte.efectivo)} />
            <Tarjeta etiqueta="Tarjeta" valor={moneda.format(reporte.tarjeta)} />
            <Tarjeta etiqueta="Transferencia" valor={moneda.format(reporte.transferencia)} />
          </div>
          <h3 className="mt-8 text-lg font-semibold">Lo que más sale</h3>
          {reporte.productos.length === 0 ? (
            <p className="mt-3 text-muted">Todavía no hay productos vendidos en este periodo.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-3xl border border-line">
              {reporte.productos.map((producto) => (
                <li key={producto.nombre} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    {producto.cantidad} × {producto.nombre}
                  </span>
                  <span className="font-medium">{moneda.format(producto.total)}</span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-8 text-lg font-semibold">Ventas del periodo</h3>
          <ListaVentas ventas={reporte.movimientos} onAnular={setAnular} />
        </>
      )}
      {anular && (
        <AnularVenta
          venta={anular}
          onCerrar={() => setAnular(null)}
          onLista={async () => {
            setAnular(null);
            await recargar();
          }}
        />
      )}
    </section>
  );
}

export function ListaVentas({
  ventas,
  onAnular,
  vacio = 'Todavía no hay ventas en este periodo.',
}: {
  ventas: VentaResumen[];
  onAnular: (venta: VentaResumen) => void;
  vacio?: string;
}) {
  if (ventas.length === 0) return <p className="mt-3 text-muted">{vacio}</p>;
  return (
    <div className="mt-3 overflow-x-auto rounded-3xl border border-line">
      <table className="min-w-[760px] w-full text-left">
        <thead className="bg-panel text-sm text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Folio</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Cajero</th>
            <th className="px-4 py-3 font-medium">Pago</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((venta) => (
            <tr key={venta.id} className="border-t border-line">
              <td className="px-4 py-3">{venta.folioVenta}</td>
              <td className="px-4 py-3">{formatoFechaHora(venta.fechaHora)}</td>
              <td className="px-4 py-3">{venta.cajero}</td>
              <td className="px-4 py-3">{venta.metodoPago}</td>
              <td className="px-4 py-3">{moneda.format(venta.total)}</td>
              <td className="px-4 py-3">
                {venta.cancelada ? (
                  <span className="text-sm text-chili">Anulada{venta.motivoCancelacion ? `: ${venta.motivoCancelacion}` : ''}</span>
                ) : (
                  <button type="button" className="min-h-10 rounded-xl border border-line px-3 text-sm" onClick={() => onAnular(venta)}>
                    Anular
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnularVenta({
  venta,
  onCerrar,
  onLista,
}: {
  venta: VentaResumen;
  onCerrar: () => void;
  onLista: () => Promise<void>;
}) {
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (motivo.trim().length < 3) {
      toast.error('Escribe el motivo de la anulación.');
      return;
    }
    setGuardando(true);
    try {
      await cancelarVenta(venta.id, motivo.trim());
      toast.success('Venta anulada');
      await onLista();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo anular la venta.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3 sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={enviar} className="w-full max-w-lg rounded-3xl bg-panel p-5">
        <h2 className="text-xl font-semibold">Anular {venta.folioVenta}</h2>
        <p className="mt-2 text-sm text-muted">
          {moneda.format(venta.total)} en {venta.metodoPago}. La venta deja de sumar en el reporte y en el corte, y el motivo queda registrado.
        </p>
        <label className="mt-4 block text-sm text-muted" htmlFor="motivo-anulacion">
          Motivo
        </label>
        <input
          id="motivo-anulacion"
          value={motivo}
          required
          minLength={3}
          maxLength={200}
          onChange={(event) => setMotivo(event.target.value)}
          className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3 outline-none focus:border-amber"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="min-h-12 rounded-2xl border border-line px-4" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="min-h-12 rounded-2xl bg-chili px-4 font-semibold text-cream disabled:opacity-50">
            {guardando ? 'Anulando…' : 'Anular venta'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Tarjeta({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <article className="rounded-3xl border border-line bg-panel px-4 py-4">
      <p className="text-sm text-muted">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
    </article>
  );
}
