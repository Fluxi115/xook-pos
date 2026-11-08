import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { MARCA } from '../../marca';
import { ApiError, cerrarSesion } from '../../services/apiClient';
import {
  crearGerente,
  crearSucursalEmpresa,
  leerEmpresa,
  type EmpresaPanel,
  type SucursalEmpresa,
} from '../../services/empresaApi';

interface EmpresaPageProps {
  onCerrarSesion: () => void;
}

export function EmpresaPage({ onCerrarSesion }: EmpresaPageProps) {
  const [panel, setPanel] = useState<EmpresaPanel | null>(null);
  const [error, setError] = useState('');
  const [alta, setAlta] = useState(false);
  const [gerente, setGerente] = useState<SucursalEmpresa | null>(null);
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

  async function cargar() {
    setError('');
    try {
      setPanel(await leerEmpresa());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar la empresa.');
    }
  }

  useEffect(() => {
    let vigente = true;
    leerEmpresa()
      .then((datos) => {
        if (vigente) setPanel(datos);
      })
      .catch((caught: unknown) => {
        if (vigente) setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar la empresa.');
      });
    return () => {
      vigente = false;
    };
  }, []);

  function salir() {
    cerrarSesion();
    onCerrarSesion();
  }

  return (
    <div className="min-h-dvh bg-ink text-cream">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-amber">{MARCA}</p>
          <h1 className="text-2xl font-semibold">{panel?.nombre ?? 'Empresa'}</h1>
          {panel && <p className="text-sm text-muted">Clave {panel.slug}</p>}
        </div>
        <button type="button" className="min-h-11 rounded-2xl border border-line px-4" onClick={salir}>
          Salir
        </button>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Cada sucursal nueva hereda la vigencia y el cupo de la primera.</p>
          <button type="button" className="min-h-11 rounded-2xl bg-amber px-4 font-semibold text-ink" onClick={() => setAlta(true)}>
            Nueva sucursal
          </button>
        </div>
        {error && <p className="rounded-2xl border border-chili/40 bg-chili/10 p-4">{error}</p>}
        {!panel && !error && <p className="text-muted">Cargando sucursales…</p>}
        {panel && (
          <div className="space-y-3">
            {arbolEmpresa(panel.sucursales).map((nodo) => (
              <BarraEmpresa
                key={nodo.sucursal.id}
                nodo={nodo}
                abiertas={abiertas}
                onAlternar={(id) => setAbiertas((actual) => ({ ...actual, [id]: !actual[id] }))}
                onGerente={setGerente}
              />
            ))}
          </div>
        )}
      </main>
      {alta && panel && (
        <SucursalModal
          sucursales={panel.sucursales}
          onCerrar={() => setAlta(false)}
          onLista={async () => {
            setAlta(false);
            await cargar();
          }}
        />
      )}
      {gerente && (
        <GerenteModal
          sucursal={gerente}
          onCerrar={() => setGerente(null)}
        />
      )}
    </div>
  );
}

function SucursalModal({
  sucursales,
  onCerrar,
  onLista,
}: {
  sucursales: SucursalEmpresa[];
  onCerrar: () => void;
  onLista: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [padre, setPadre] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      await crearSucursalEmpresa({
        nombreComercial: nombre,
        codigo,
        parentSucursalId: padre || undefined,
      });
      toast.success('Sucursal creada');
      await onLista();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo crear la sucursal.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <dialog open className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <form onSubmit={enviar} className="w-full max-w-lg rounded-3xl border border-line bg-panel p-5" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-xl font-semibold">Nueva sucursal</h2>
        <label className="mt-4 block text-sm text-muted" htmlFor="suc-nombre">Nombre</label>
        <input id="suc-nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} required className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3" />
        <label className="mt-3 block text-sm text-muted" htmlFor="suc-codigo">Código</label>
        <input id="suc-codigo" value={codigo} onChange={(event) => setCodigo(event.target.value)} required placeholder="TAQ-AME-02" className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3" />
        <label className="mt-3 block text-sm text-muted" htmlFor="suc-padre">Sucursal padre</label>
        <select id="suc-padre" value={padre} onChange={(event) => setPadre(event.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3">
          <option value="">Sin padre</option>
          {sucursales.map((sucursal) => (
            <option key={sucursal.id} value={sucursal.id}>{sucursal.nombreComercial}</option>
          ))}
        </select>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="min-h-12 rounded-2xl border border-line px-4" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando} className="min-h-12 rounded-2xl bg-amber px-4 font-semibold text-ink disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Crear'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function GerenteModal({ sucursal, onCerrar }: { sucursal: SucursalEmpresa; onCerrar: () => void }) {
  const [nombre, setNombre] = useState('');
  const [password, setPassword] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      const creado = await crearGerente(sucursal.id, { nombre, password });
      toast.success(`Entra con ${creado.username}`);
      onCerrar();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo crear el gerente.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <dialog open className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-4" onClick={onCerrar}>
      <form onSubmit={enviar} className="w-full max-w-lg rounded-3xl border border-line bg-panel p-5" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-xl font-semibold">Gerente de {sucursal.nombreComercial}</h2>
        <p className="mt-1 text-sm text-muted">El usuario se arma con la empresa y esta sucursal. Solo podrá crear cajeros y meseros de aquí.</p>
        <label className="mt-4 block text-sm text-muted" htmlFor="ger-nombre">Nombre</label>
        <input id="ger-nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} required className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3" />
        <label className="mt-3 block text-sm text-muted" htmlFor="ger-pass">Contraseña</label>
        <input id="ger-pass" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="min-h-12 rounded-2xl border border-line px-4" onClick={onCerrar}>Cancelar</button>
          <button type="submit" disabled={guardando} className="min-h-12 rounded-2xl bg-amber px-4 font-semibold text-ink disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Crear gerente'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

interface NodoEmpresa {
  sucursal: SucursalEmpresa;
  hijos: NodoEmpresa[];
}

function arbolEmpresa(sucursales: SucursalEmpresa[]): NodoEmpresa[] {
  const ids = new Set(sucursales.map((sucursal) => sucursal.id));
  const hijos = new Map<string, SucursalEmpresa[]>();
  const raices: SucursalEmpresa[] = [];
  const comparar = (a: SucursalEmpresa, b: SucursalEmpresa) => a.nombreComercial.localeCompare(b.nombreComercial, 'es');
  for (const sucursal of [...sucursales].sort(comparar)) {
    if (sucursal.parentSucursalId && ids.has(sucursal.parentSucursalId)) {
      const lista = hijos.get(sucursal.parentSucursalId) ?? [];
      lista.push(sucursal);
      hijos.set(sucursal.parentSucursalId, lista);
    } else {
      raices.push(sucursal);
    }
  }
  const nodo = (sucursal: SucursalEmpresa): NodoEmpresa => ({ sucursal, hijos: (hijos.get(sucursal.id) ?? []).map(nodo) });
  return raices.map(nodo);
}

function BarraEmpresa({
  nodo,
  abiertas,
  onAlternar,
  onGerente,
}: {
  nodo: NodoEmpresa;
  abiertas: Record<string, boolean>;
  onAlternar: (id: string) => void;
  onGerente: (sucursal: SucursalEmpresa) => void;
}) {
  const { sucursal, hijos } = nodo;
  const abierta = abiertas[sucursal.id] ?? false;
  return (
    <article className="rounded-2xl border border-line bg-panel/40">
      <div className="flex items-center gap-2 p-3">
        {hijos.length > 0 ? (
          <button
            type="button"
            aria-expanded={abierta}
            aria-label={abierta ? `Cerrar sub-sucursales de ${sucursal.nombreComercial}` : `Abrir sub-sucursales de ${sucursal.nombreComercial}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line text-lg"
            onClick={() => onAlternar(sucursal.id)}
          >
            {abierta ? '▾' : '▸'}
          </button>
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center text-muted" aria-hidden>
            ·
          </span>
        )}
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onAlternar(sucursal.id)}>
          <span className="block truncate font-semibold">{sucursal.nombreComercial}</span>
          <span className="block truncate text-xs text-muted">{sucursal.codigo}</span>
          <span className="block truncate text-xs text-amber">
            {sucursal.parentNombre ? `Sub-sucursal de ${sucursal.parentNombre}` : 'Sucursal principal'}
            {hijos.length > 0 ? ` · ${hijos.length} ${hijos.length === 1 ? 'sub-sucursal' : 'sub-sucursales'}` : ''}
          </span>
        </button>
      </div>
      {abierta && (
        <div className="border-t border-line px-3 py-3">
          <button type="button" className="min-h-11 rounded-xl border border-line px-3 text-sm" onClick={() => onGerente(sucursal)}>
            Crear gerente
          </button>
          {hijos.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-amber/50 pl-2 sm:pl-3">
              {hijos.map((hijo) => (
                <BarraEmpresa key={hijo.sucursal.id} nodo={hijo} abiertas={abiertas} onAlternar={onAlternar} onGerente={onGerente} />
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
