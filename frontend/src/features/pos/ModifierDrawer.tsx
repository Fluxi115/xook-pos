import { useMemo, useState } from 'react';
import type { ModificadorSeleccionado, ProductoLocal } from '../../db/db';
import { moneda, precioConExtras } from './pedido';

interface ModifierDrawerProps {
  producto: ProductoLocal | null;
  onCerrar: () => void;
  onAgregar: (modificadores: ModificadorSeleccionado[], precioUnitario: number) => void;
}

export function ModifierDrawer({ producto, onCerrar, onAgregar }: ModifierDrawerProps) {
  const [seleccion, setSeleccion] = useState<Record<string, string[]>>({});
  const [aviso, setAviso] = useState('');

  const elegidos = useMemo(() => {
    if (!producto) return [];
    return producto.modificadores.flatMap((grupo) =>
      grupo.opciones
        .filter((opcion) => (seleccion[grupo.id] ?? []).includes(opcion.id))
        .map((opcion) => ({
          opcionId: opcion.id,
          nombre: opcion.nombre,
          precioAdicional: opcion.precioAdicional,
        })),
    );
  }, [producto, seleccion]);

  if (!producto) return null;

  const precio = precioConExtras(producto.precioBase, elegidos);

  function alternar(grupoId: string, opcionId: string, maximo: number) {
    setAviso('');
    setSeleccion((actual) => {
      const elegidas = actual[grupoId] ?? [];
      if (elegidas.includes(opcionId)) {
        return { ...actual, [grupoId]: elegidas.filter((id) => id !== opcionId) };
      }
      if (maximo === 1) return { ...actual, [grupoId]: [opcionId] };
      if (maximo > 1 && elegidas.length >= maximo) return actual;
      return { ...actual, [grupoId]: [...elegidas, opcionId] };
    });
  }

  function confirmar() {
    if (!producto) return;
    for (const grupo of producto.modificadores) {
      if (grupo.esObligatorio && (seleccion[grupo.id] ?? []).length === 0) {
        setAviso(`Elige al menos una opción de ${grupo.nombre}.`);
        return;
      }
    }
    onAgregar(elegidos, precio);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/65 md:items-center" role="dialog" aria-modal="true" aria-labelledby="titulo-extra">
      <button type="button" className="absolute inset-0" aria-label="Cerrar extras" onClick={onCerrar} />
      <div className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-panel p-4 md:max-w-lg md:rounded-3xl md:p-6">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line md:hidden" />
        <h2 id="titulo-extra" className="text-2xl font-semibold">
          {producto.nombre}
        </h2>
        <p className="text-sm text-muted">{moneda.format(producto.precioBase)} base</p>
        <div className="mt-4 flex flex-col gap-5 overflow-y-auto pr-1">
          {producto.modificadores.map((grupo) => {
            const unica = grupo.seleccionMaxima === 1;
            return (
              <fieldset key={grupo.id} className="border-0 p-0">
                <legend className="text-sm text-muted">
                  {grupo.nombre}
                  {grupo.esObligatorio ? ' · obligatorio' : ' · opcional'}
                  {grupo.seleccionMaxima > 1 ? ` · máximo ${grupo.seleccionMaxima}` : ''}
                </legend>
                <div className="mt-2 flex flex-col gap-2">
                  {grupo.opciones.map((opcion) => {
                    const activo = (seleccion[grupo.id] ?? []).includes(opcion.id);
                    return (
                      <button
                        key={opcion.id}
                        type="button"
                        role={unica ? 'radio' : 'checkbox'}
                        aria-checked={activo}
                        onClick={() => alternar(grupo.id, opcion.id, grupo.seleccionMaxima)}
                        className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 text-left text-base ${activo ? 'border-amber bg-amber text-ink' : 'border-line bg-ink'}`}
                      >
                        <span>{opcion.nombre}</span>
                        <span>{opcion.precioAdicional > 0 ? `+${moneda.format(opcion.precioAdicional)}` : 'incluido'}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
        {aviso && <p className="mt-3 text-sm text-chili">{aviso}</p>}
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" className="min-h-14 rounded-2xl bg-amber px-3 text-base font-semibold text-ink" onClick={confirmar}>
            Agregar al pedido (+{moneda.format(precio)})
          </button>
          <button type="button" className="min-h-14 rounded-2xl border border-line text-base" onClick={onCerrar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
