import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { db, type ModificadorSeleccionado, type ProductoLocal } from '../../db/db';
import { ApiError, cerrarSesion, type Sesion } from '../../services/apiClient';
import { descargarCatalogo, esReintento, sincronizarVentasPendientes } from '../../services/syncService';
import { Spinner } from './Spinner';
import { turnoActivo, type CorteCaja, type TurnoActivo } from '../../services/cajaApi';
import { AperturaCaja, CorteModal, MovimientoModal, TicketCorte } from './TurnoCaja';
import { VentasRechazadas } from './VentasRechazadas';
import { CartPanel } from './CartPanel';
import { ModifierDrawer } from './ModifierDrawer';
import { PaymentModal } from './PaymentModal';
import { MARCA } from '../../marca';
import { LogoEmpresa } from '../LogoEmpresa';
import { moneda, piezasDe, totalesDe, type LineaPedido } from './pedido';

interface PosViewProps {
  sesion: Sesion;
  enLinea: boolean;
  onCerrarSesion: () => void;
}

type PanelMovil = 'menu' | 'pedido';

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function PosView({ sesion, enLinea, onCerrarSesion }: PosViewProps) {
  const tenant = useLiveQuery(async () => (await db.tenantInfo.toArray())[0] ?? null);
  const categorias = useLiveQuery(() => db.categorias.orderBy('orden').toArray());
  const productos = useLiveQuery(() => db.productos.orderBy('nombre').toArray());

  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('todas');
  const [panel, setPanel] = useState<PanelMovil>('menu');
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [editor, setEditor] = useState<ProductoLocal | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [actualizando, setActualizando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [turno, setTurno] = useState<TurnoActivo | null | undefined>(undefined);
  const pendientes =
    useLiveQuery(() => db.ventasPendientes.filter((venta) => esReintento(venta, sesion.usuarioId)).count(), [sesion.usuarioId]) ?? 0;
  const [movimiento, setMovimiento] = useState(false);
  const [corte, setCorte] = useState(false);
  const [ticket, setTicket] = useState<CorteCaja | null>(null);
  const catalogoIntentado = useRef(false);

  useEffect(() => {
    if (catalogoIntentado.current || !enLinea || productos === undefined) return;
    catalogoIntentado.current = true;
    void descargarCatalogo().catch(() => undefined);
  }, [enLinea, productos]);

  useEffect(() => {
    let vigente = true;
    turnoActivo()
      .then((actual) => {
        if (vigente) setTurno(actual);
      })
      .catch((caught: unknown) => {
        if (!vigente || (caught instanceof ApiError && caught.status === 401)) return;
        setTurno(null);
      });
    return () => {
      vigente = false;
    };
  }, [enLinea]);

  const cargandoMenu = categorias === undefined || productos === undefined;
  const listaCategorias = categorias ?? [];
  const consulta = normalizar(busqueda.trim());
  const visibles = useMemo(() => {
    return (productos ?? []).filter((producto) => {
      const coincideCategoria = categoriaId === 'todas' || producto.categoriaId === categoriaId;
      const coincideBusqueda = consulta.length === 0 || normalizar(producto.nombre).includes(consulta);
      return producto.disponible && coincideCategoria && coincideBusqueda;
    });
  }, [productos, categoriaId, consulta]);

  const piezas = piezasDe(lineas);
  const tasa = tenant?.tasaImpuesto ?? 0;
  const { total } = totalesDe(lineas, tasa);
  const negocio = tenant?.nombreComercial ?? 'Sucursal';

  function agregar(producto: ProductoLocal, modificadores: ModificadorSeleccionado[], precioUnitario: number) {
    setLineas((actuales) => [
      ...actuales,
      {
        key: crypto.randomUUID(),
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precioUnitario,
        modificadores,
      },
    ]);
    setEditor(null);
    toast.success(`${producto.nombre} agregado`);
  }

  function elegir(producto: ProductoLocal) {
    if (!producto.disponible) return;
    if (producto.modificadores.length === 0) {
      agregar(producto, [], producto.precioBase);
      return;
    }
    setEditor(producto);
  }

  function cambiarCantidad(key: string, delta: number) {
    setLineas((actuales) =>
      actuales.map((linea) => (linea.key === key ? { ...linea, cantidad: Math.max(1, linea.cantidad + delta) } : linea)),
    );
  }

  function salir() {
    cerrarSesion();
    onCerrarSesion();
  }

  async function sincronizarAhora() {
    if (sincronizando) return;
    if (!enLinea) {
      toast.warning('Sin conexión: Venta guardada de forma segura en el dispositivo');
      return;
    }
    const cantidad = pendientes;
    setSincronizando(true);
    const aviso = toast.loading(`Sincronizando ${cantidad} ventas...`);
    try {
      const resultado = await sincronizarVentasPendientes(false);
      if (resultado.rechazadas > 0) {
        toast.error(
          resultado.rechazadas === 1
            ? 'Una venta fue rechazada. Revisa el aviso de la caja.'
            : `${resultado.rechazadas} ventas fueron rechazadas. Revisa el aviso de la caja.`,
          { id: aviso },
        );
        return;
      }
      toast.success(`Sincronizando ${resultado.sincronizadas || cantidad} ventas...`, { id: aviso });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        toast.dismiss(aviso);
        return;
      }
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudieron sincronizar las ventas.', { id: aviso });
    } finally {
      setSincronizando(false);
    }
  }

  async function actualizarMenu() {
    setActualizando(true);
    try {
      await descargarCatalogo();
      toast.success('Menú actualizado');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return;
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo actualizar el menú.');
    } finally {
      setActualizando(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-ink">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-3 md:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <LogoEmpresa src={tenant?.logoUrl} nombre={negocio} />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.16em] text-amber">{MARCA}</p>
            <p className="truncate text-lg font-semibold">{negocio}</p>
            <p className="truncate text-sm text-muted">{sesion.nombre}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-2 text-sm font-medium ${enLinea ? 'bg-leaf/20 text-leaf' : 'bg-orange/20 text-orange'}`}>
            {enLinea ? 'Online' : 'Offline'}
            {pendientes > 0 ? ` · ${pendientes}` : ''}
          </span>
          {pendientes > 0 && (
            <button
              type="button"
              onClick={() => void sincronizarAhora()}
              disabled={sincronizando}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-line px-4 text-sm disabled:opacity-50"
            >
              {sincronizando && <Spinner />}
              {sincronizando ? `Sincronizando ${pendientes} ventas...` : 'Sincronizar ahora'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void actualizarMenu()}
            disabled={actualizando}
            className="min-h-12 rounded-2xl border border-line px-4 text-sm disabled:opacity-50"
          >
            Actualizar
          </button>
          {turno && (
            <>
              <button type="button" className="min-h-12 rounded-2xl border border-line px-4 text-sm" onClick={() => setMovimiento(true)}>
                Entrada / Salida
              </button>
              <button type="button" className="min-h-12 rounded-2xl border border-line px-4 text-sm" onClick={() => setCorte(true)}>
                Corte de caja
              </button>
            </>
          )}
          {sesion.rol === 'AdminSucursal' && (
            <Link to="/admin" className="inline-flex min-h-12 items-center rounded-2xl border border-line px-4 text-sm">
              Panel
            </Link>
          )}
          <button type="button" onClick={salir} className="min-h-12 rounded-2xl border border-line px-4 text-sm">
            Salir
          </button>
        </div>
      </header>
      <div className="px-3 md:px-4">
        <VentasRechazadas tenantId={sesion.tenantId} />
      </div>

      <div className="flex min-h-0 flex-1">
        <section className={`min-h-0 flex-1 flex-col ${panel === 'pedido' ? 'hidden md:flex' : 'flex'}`}>
          <div className="sticky top-0 z-10 space-y-3 bg-ink/95 px-3 py-3 backdrop-blur md:px-4">
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar producto"
              aria-label="Buscar producto"
              className="min-h-14 w-full rounded-2xl border border-line bg-panel px-4 text-base outline-none focus:border-amber"
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Pill activo={categoriaId === 'todas'} onClick={() => setCategoriaId('todas')}>
                Todas
              </Pill>
              {cargandoMenu &&
                Array.from({ length: 3 }, (_, indice) => (
                  <span key={indice} className="h-12 w-24 shrink-0 animate-pulse rounded-full bg-panel-2" />
                ))}
              {listaCategorias.map((categoria) => (
                <Pill key={categoria.id} activo={categoriaId === categoria.id} onClick={() => setCategoriaId(categoria.id)}>
                  {categoria.nombre}
                </Pill>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4 md:px-4">
            {cargandoMenu || actualizando ? (
              <EsqueletoMenu />
            ) : visibles.length === 0 ? (
              <p className="py-16 text-center text-muted">
                {consulta ? 'No hay productos para esta búsqueda.' : 'No hay productos disponibles.'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {visibles.map((producto) => (
                  <button
                    key={producto.id}
                    type="button"
                    disabled={!producto.disponible}
                    onClick={() => elegir(producto)}
                    className="overflow-hidden rounded-3xl border border-line bg-panel text-left active:scale-[0.98] disabled:opacity-45"
                  >
                    {producto.fotoUrl ? (
                      <img src={producto.fotoUrl} alt="" className="h-28 w-full object-cover" />
                    ) : (
                      <div className="flex h-28 items-center justify-center bg-panel-2 text-3xl font-semibold text-amber">
                        {producto.nombre.slice(0, 1)}
                      </div>
                    )}
                    <div className="p-3">
                      <p className="line-clamp-2 min-h-12 text-base font-medium">{producto.nombre}</p>
                      <p className="mt-2 text-lg font-semibold text-amber">{moneda.format(producto.precioBase)}</p>
                      {!producto.disponible && <p className="text-sm text-chili">Agotado</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside
          className={`min-h-0 w-full flex-col border-line bg-panel md:w-[360px] md:shrink-0 md:border-l lg:w-[400px] ${panel === 'menu' ? 'hidden md:flex' : 'flex'}`}
        >
          <CartPanel
              lineas={lineas}
              tasa={tasa}
              onCambiarCantidad={cambiarCantidad}
              onQuitar={(key) => setLineas((actuales) => actuales.filter((linea) => linea.key !== key))}
              onVaciar={() => setLineas([])}
              onCobrar={() => setCobrando(true)}
            />
        </aside>
      </div>

      <nav className="grid shrink-0 grid-cols-2 border-t border-line bg-panel md:hidden">
        <button
          type="button"
          onClick={() => setPanel('menu')}
          className={`min-h-16 text-base ${panel === 'menu' ? 'text-amber' : 'text-muted'}`}
        >
          Menú
        </button>
        <button
          type="button"
          onClick={() => setPanel('pedido')}
          className={`min-h-16 text-base ${panel === 'pedido' ? 'text-amber' : 'text-muted'}`}
        >
          Pedido{piezas > 0 ? ` · ${piezas} · ${moneda.format(total)}` : ''}
        </button>
      </nav>

      <ModifierDrawer
        key={editor?.id ?? 'sin-producto'}
        producto={editor}
        onCerrar={() => setEditor(null)}
        onAgregar={(mods, precio) => editor && agregar(editor, mods, precio)}
      />
      {cobrando && turno && (
        <PaymentModal
          lineas={lineas}
          nombreNegocio={negocio}
          cajero={sesion.nombre}
          tasa={tasa}
          direccion={tenant?.direccion}
          telefono={tenant?.telefono}
          mensajeTicket={tenant?.mensajeTicket}
          onCerrar={() => setCobrando(false)}
          onVentaRegistrada={() => {
            setLineas([]);
            void turnoActivo().then(setTurno).catch(() => undefined);
          }}
        />
      )}
      {turno === undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink">
          <p className="text-muted">Revisando el turno de caja…</p>
        </div>
      )}
      {turno === null && <AperturaCaja onAbierto={setTurno} onSalir={salir} />}
      {movimiento && turno && (
        <MovimientoModal
          onCerrar={() => setMovimiento(false)}
          onGuardado={(actual) => {
            setTurno(actual);
            setMovimiento(false);
          }}
        />
      )}
      {corte && turno && (
        <CorteModal turno={turno} negocio={negocio} onCerrar={() => setCorte(false)} onCerrado={setTicket} />
      )}
      {ticket && <TicketCorte corte={ticket} negocio={negocio} onSalir={onCerrarSesion} />}
    </div>
  );
}

function EsqueletoMenu() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Cargando menú">
      {Array.from({ length: 8 }, (_, indice) => (
        <div key={indice} className="overflow-hidden rounded-3xl border border-line bg-panel">
          <div className="h-28 animate-pulse bg-panel-2" />
          <div className="space-y-3 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-panel-2" />
            <div className="h-4 w-1/3 animate-pulse rounded-full bg-panel-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Pill({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-12 shrink-0 rounded-full px-5 text-base ${activo ? 'bg-amber font-semibold text-ink' : 'border border-line'}`}
    >
      {children}
    </button>
  );
}
