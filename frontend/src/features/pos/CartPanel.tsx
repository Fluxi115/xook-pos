import { useState } from 'react';
import { moneda, piezasDe, totalesDe, type LineaPedido } from './pedido';

interface CartPanelProps {
  lineas: LineaPedido[];
  tasa?: number;
  onCambiarCantidad: (key: string, delta: number) => void;
  onQuitar: (key: string) => void;
  onVaciar: () => void;
  onCobrar: () => void;
}

export function CartPanel({ lineas, tasa = 0, onCambiarCantidad, onQuitar, onVaciar, onCobrar }: CartPanelProps) {
  const [pedirVacio, setPedirVacio] = useState(false);
  const { subtotal, impuestos, total } = totalesDe(lineas, tasa);
  const piezas = piezasDe(lineas);

  function vaciar() {
    if (!pedirVacio) {
      setPedirVacio(true);
      return;
    }
    setPedirVacio(false);
    onVaciar();
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-xl font-semibold">Pedido</h2>
        <span className="text-sm text-muted">{piezas} {piezas === 1 ? 'pieza' : 'piezas'}</span>
      </div>
      <div className="mt-3 flex-1 space-y-3 overflow-y-auto px-4">
        {lineas.length === 0 && <p className="py-8 text-center text-sm text-muted">Toca un producto para armar la orden.</p>}
        {lineas.map((linea) => (
          <article key={linea.key} className="rounded-2xl border border-line bg-ink p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-medium">{linea.nombre}</p>
                {linea.modificadores.length > 0 && (
                  <p className="mt-1 text-sm text-muted">{linea.modificadores.map((extra) => extra.nombre).join(' · ')}</p>
                )}
                <p className="mt-1 text-sm text-muted">{moneda.format(linea.precioUnitario)} c/u</p>
              </div>
              <p className="text-base font-semibold">{moneda.format(linea.precioUnitario * linea.cantidad)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-12 w-12 rounded-2xl border border-line text-xl"
                  onClick={() => onCambiarCantidad(linea.key, -1)}
                  disabled={linea.cantidad <= 1}
                  aria-label={`Quitar uno de ${linea.nombre}`}
                >
                  −
                </button>
                <span className="w-8 text-center text-lg">{linea.cantidad}</span>
                <button
                  type="button"
                  className="h-12 w-12 rounded-2xl border border-line text-xl"
                  onClick={() => onCambiarCantidad(linea.key, 1)}
                  aria-label={`Agregar uno de ${linea.nombre}`}
                >
                  +
                </button>
              </div>
              <button type="button" className="min-h-12 px-3 text-sm text-chili" onClick={() => onQuitar(linea.key)}>
                Quitar
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="border-t border-line px-4 py-4">
        <Fila etiqueta="Subtotal" valor={moneda.format(subtotal)} />
        <Fila etiqueta="Impuestos" valor={moneda.format(impuestos)} />
        <div className="mt-2 flex items-center justify-between text-2xl font-semibold">
          <span>Total</span>
          <span>{moneda.format(total)}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={lineas.length === 0}
            onClick={vaciar}
            className="min-h-14 rounded-2xl border border-line text-base disabled:opacity-40"
          >
            {pedirVacio ? '¿Vaciar?' : 'Vaciar carrito'}
          </button>
          <button
            type="button"
            disabled={lineas.length === 0}
            onClick={onCobrar}
            className="min-h-14 rounded-2xl bg-amber text-base font-semibold text-ink disabled:opacity-40"
          >
            Cobrar / Confirmar orden
          </button>
        </div>
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between text-sm text-muted">
      <span>{etiqueta}</span>
      <span>{valor}</span>
    </div>
  );
}
