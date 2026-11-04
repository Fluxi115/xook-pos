import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { db } from '../../db/db';
import { ApiError, cerrarSesion, leerSesion } from '../../services/apiClient';
import { abrirTurno, cerrarTurno, formatoFechaHora, registrarMovimiento, turnoActivo, type CorteCaja, type TurnoActivo } from '../../services/cajaApi';
import { bloqueaCierre, sincronizarVentasPendientes } from '../../services/syncService';
import { MARCA } from '../../marca';
import { moneda, redondear } from './pedido';
import { Spinner } from './Spinner';

const FONDOS = [0, 200, 500, 1000];

export function AperturaCaja({ onAbierto, onSalir }: { onAbierto: (turno: TurnoActivo) => void; onSalir: () => void }) {
  const [fondo, setFondo] = useState('500');
  const [guardando, setGuardando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const monto = Number(fondo);
    if (!Number.isFinite(monto) || monto < 0) {
      toast.error('Indica un fondo inicial válido.');
      return;
    }
    setGuardando(true);
    try {
      onAbierto(await abrirTurno(monto));
      toast.success('Caja abierta');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return;
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo abrir la caja. Revisa la conexión.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4">
      <form onSubmit={enviar} className="w-full max-w-md rounded-3xl border border-line bg-panel p-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-amber">{MARCA}</p>
        <h2 className="mt-2 text-2xl font-semibold">Apertura de caja</h2>
        <p className="mt-2 text-sm text-muted">Ingresa el fondo inicial. No se puede vender hasta abrir el turno.</p>
        <label className="mt-5 block text-sm text-muted" htmlFor="fondo-inicial">
          Fondo inicial
        </label>
        <input
          id="fondo-inicial"
          type="number"
          min={0}
          step="0.01"
          required
          value={fondo}
          onChange={(event) => setFondo(event.target.value)}
          className="mt-1 min-h-14 w-full rounded-2xl border border-line bg-ink px-4 text-lg outline-none focus:border-amber"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {FONDOS.map((cantidad) => (
            <button key={cantidad} type="button" className="min-h-11 rounded-full border border-line px-4" onClick={() => setFondo(String(cantidad))}>
              {moneda.format(cantidad)}
            </button>
          ))}
        </div>
        <button type="submit" disabled={guardando} className="mt-6 min-h-14 w-full rounded-2xl bg-amber text-lg font-semibold text-ink disabled:opacity-50">
          {guardando ? 'Abriendo…' : 'Abrir caja'}
        </button>
        <button type="button" className="mt-3 min-h-12 w-full rounded-2xl border border-line" onClick={onSalir}>
          Salir
        </button>
      </form>
    </div>
  );
}

export function MovimientoModal({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: (turno: TurnoActivo) => void }) {
  const [tipo, setTipo] = useState<'Entrada' | 'Salida'>('Salida');
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const valor = Number(monto);
    if (!Number.isFinite(valor) || valor <= 0 || motivo.trim().length === 0) {
      toast.error('Indica un monto y el motivo.');
      return;
    }
    setGuardando(true);
    try {
      const turno = await registrarMovimiento({ tipo, monto: valor, motivo });
      toast.success(tipo === 'Entrada' ? 'Entrada registrada' : 'Salida registrada');
      onGuardado(turno);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return;
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo registrar el movimiento.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3 sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={enviar} className="w-full max-w-md rounded-3xl bg-panel p-5">
        <h2 className="text-xl font-semibold">Entrada o salida de efectivo</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className={`min-h-12 rounded-2xl ${tipo === 'Entrada' ? 'bg-leaf font-semibold text-ink' : 'border border-line'}`} onClick={() => setTipo('Entrada')}>
            Entrada
          </button>
          <button type="button" className={`min-h-12 rounded-2xl ${tipo === 'Salida' ? 'bg-chili font-semibold text-ink' : 'border border-line'}`} onClick={() => setTipo('Salida')}>
            Salida
          </button>
        </div>
        <label className="mt-4 block text-sm text-muted" htmlFor="mov-monto">
          Monto
        </label>
        <input id="mov-monto" type="number" min="0.01" step="0.01" required value={monto} onChange={(event) => setMonto(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3" />
        <label className="mt-3 block text-sm text-muted" htmlFor="mov-motivo">
          Motivo
        </label>
        <input id="mov-motivo" required value={motivo} onChange={(event) => setMotivo(event.target.value)} placeholder="Compra de insumos, cambio, etc." className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3" />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="min-h-12 rounded-2xl border border-line px-4" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="min-h-12 rounded-2xl bg-amber px-4 font-semibold text-ink disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CorteModal({
  turno,
  negocio,
  onCerrar,
  onCerrado,
}: {
  turno: TurnoActivo;
  negocio: string;
  onCerrar: () => void;
  onCerrado: (corte: CorteCaja) => void;
}) {
  const [contado, setContado] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const enviando = useRef(false);
  const [resumen, setResumen] = useState(turno);
  const monto = Number(contado);
  const diferencia = Number.isFinite(monto) && contado.trim() !== '' ? redondear(monto - resumen.efectivoEsperado) : null;

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(monto) || monto < 0) {
      toast.error('El efectivo contado no es un monto válido.');
      return;
    }
    if (enviando.current) return;
    enviando.current = true;
    setGuardando(true);
    try {
      await sincronizarVentasPendientes();
      const sesion = leerSesion();
      if (!sesion) return;
      const actual = await turnoActivo();
      if (actual && redondear(actual.efectivoEsperado) !== redondear(resumen.efectivoEsperado)) {
        setResumen(actual);
        toast.warning('Llegaron ventas de este turno. Revisa el efectivo esperado antes de cerrar.');
        return;
      }
      const pendientes = await db.ventasPendientes.filter((venta) => bloqueaCierre(venta, sesion.usuarioId, resumen.id)).count();
      if (pendientes > 0) {
        toast.error('Hay ventas de este turno sin sincronizar. Conéctate para incluirlas en el corte.');
        return;
      }
      onCerrado(await cerrarTurno({ efectivoContado: monto, observaciones: notas }));
      toast.success('Turno cerrado con éxito');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return;
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo cerrar el turno.');
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3 sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={enviar} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-panel p-5">
        <p className="text-xs font-semibold tracking-[0.16em] text-amber">{MARCA}</p>
        <p className="mt-2 text-xs tracking-[0.18em] text-muted uppercase">Corte Z</p>
        <h2 className="mt-1 text-xl font-semibold">Cerrar turno</h2>
        <p className="mt-1 text-sm text-muted">{negocio} · abierto {formatoFechaHora(resumen.fechaApertura)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Dato etiqueta="Fondo" valor={moneda.format(resumen.fondoInicial)} />
          <Dato etiqueta="Efectivo" valor={moneda.format(resumen.ventasEfectivo)} />
          <Dato etiqueta="Tarjeta" valor={moneda.format(resumen.ventasTarjeta)} />
          <Dato etiqueta="Transferencia" valor={moneda.format(resumen.ventasTransferencia)} />
          <Dato etiqueta="Entradas" valor={moneda.format(resumen.totalEntradas)} />
          <Dato etiqueta="Salidas" valor={moneda.format(resumen.totalSalidas)} />
        </div>
        <p className="mt-4 text-sm text-muted">Efectivo esperado</p>
        <p className="text-2xl font-semibold">{moneda.format(resumen.efectivoEsperado)}</p>
        {resumen.movimientos.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {resumen.movimientos.map((movimiento) => (
              <li key={movimiento.id}>
                {movimiento.tipo === 'Entrada' ? '+' : '−'} {moneda.format(movimiento.monto)} · {movimiento.motivo}
              </li>
            ))}
          </ul>
        )}
        <label className="mt-4 block text-sm text-muted" htmlFor="efectivo-contado">
          Efectivo contado
        </label>
        <input
          id="efectivo-contado"
          type="number"
          min={0}
          step="0.01"
          required
          value={contado}
          onChange={(event) => setContado(event.target.value)}
          className="mt-1 min-h-14 w-full rounded-2xl border border-line bg-ink px-4 text-lg"
        />
        {diferencia !== null && <ResultadoArqueo diferencia={diferencia} />}
        <label className="mt-3 block text-sm text-muted" htmlFor="corte-notas">
          Observaciones
        </label>
        <input id="corte-notas" value={notas} onChange={(event) => setNotas(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3" />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="min-h-12 rounded-2xl border border-line px-4" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber px-4 font-semibold text-ink disabled:opacity-50">
            {guardando ? (
              <>
                <Spinner />
                Procesando...
              </>
            ) : (
              'Confirmar cierre Z'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export function TicketCorte({ corte, negocio, onSalir }: { corte: CorteCaja; negocio: string; onSalir: () => void }) {
  function salir() {
    cerrarSesion();
    onSalir();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4">
      <div className="w-full max-w-sm">
        <article className="ticket-impresion mx-auto rounded-2xl bg-cream px-4 py-5 text-ink">
          <p className="text-center text-xs font-semibold tracking-[0.14em]">{MARCA}</p>
          <p className="mt-1 text-center text-xs tracking-[0.2em] uppercase">Cierre Z</p>
          <h2 className="text-center text-xl font-semibold">{negocio}</h2>
          <p className="text-center text-sm">{formatoFechaHora(corte.fechaCorte)}</p>
          <p className="mt-2 text-center text-sm">{corte.cajero}</p>
          <dl className="mt-4 space-y-1 text-sm">
            <Fila etiqueta="Fondo" valor={moneda.format(corte.fondoInicial)} />
            <Fila etiqueta="Efectivo" valor={moneda.format(corte.totalVentasEfectivo)} />
            <Fila etiqueta="Tarjeta" valor={moneda.format(corte.totalVentasTarjeta)} />
            <Fila etiqueta="Transferencia" valor={moneda.format(corte.totalVentasTransferencia)} />
            <Fila etiqueta="Entradas" valor={moneda.format(corte.totalEntradas)} />
            <Fila etiqueta="Salidas" valor={moneda.format(corte.totalSalidas)} />
            <Fila etiqueta="Esperado" valor={moneda.format(corte.efectivoEsperado)} />
            <Fila etiqueta="Contado" valor={moneda.format(corte.efectivoContado)} />
            <Fila etiqueta="Diferencia" valor={moneda.format(corte.diferencia)} />
          </dl>
          {corte.observaciones && <p className="mt-3 text-sm">{corte.observaciones}</p>}
        </article>
        <div className="mt-4 flex gap-2 print:hidden">
          <button type="button" className="min-h-12 flex-1 rounded-2xl border border-line" onClick={() => window.print()}>
            Imprimir
          </button>
          <button type="button" className="min-h-12 flex-1 rounded-2xl bg-amber font-semibold text-ink" onClick={salir}>
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResultadoArqueo({ diferencia }: { diferencia: number }) {
  if (Math.abs(diferencia) < 0.005) return <p className="mt-3 text-sm text-muted">La caja cuadra.</p>;
  if (diferencia > 0) return <p className="mt-3 text-lg font-semibold text-leaf">Sobrante {moneda.format(diferencia)}</p>;
  return <p className="mt-3 text-lg font-semibold text-chili">Faltante {moneda.format(Math.abs(diferencia))}</p>;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-line px-3 py-2">
      <p className="text-muted">{etiqueta}</p>
      <p className="font-semibold">{valor}</p>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
