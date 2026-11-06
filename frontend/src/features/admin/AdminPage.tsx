import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MARCA } from '../../marca';
import { LogoEmpresa } from '../LogoEmpresa';
import { reducirLogo } from '../logo';
import { moneda } from '../pos/pedido';
import { VentasRechazadas } from '../pos/VentasRechazadas';
import { ApiError, cerrarSesion } from '../../services/apiClient';
import { useAuth } from '../auth/sesion';
import {
  crearPersonal,
  crearProductoAdmin,
  editarProductoAdmin,
  eliminarProductoAdmin,
  formatoFechaHora,
  listarCategoriasAdmin,
  listarCortes,
  listarModificadoresAdmin,
  listarPersonal,
  listarProductosAdmin,
  metricasSucursal,
  type CategoriaAdmin,
  type DashboardAdmin,
  type GrupoAdmin,
  type ProductoAdmin,
  type UsuarioSucursal,
  type VentaResumen,
} from '../../services/tenantAdminApi';
import { AnularVenta, ListaVentas, ReportesPanel } from './ReportesPanel';
import { TicketPanel } from './TicketPanel';
import { ResultadoArqueo } from '../pos/TurnoCaja';
import type { CorteCaja } from '../../services/cajaApi';

type Seccion = 'resumen' | 'reportes' | 'menu' | 'personal' | 'cortes' | 'ticket';

interface AdminPageProps {
  onCerrarSesion: () => void;
}

export function AdminPage({ onCerrarSesion }: AdminPageProps) {
  const { sesion } = useAuth();
  const [seccion, setSeccion] = useState<Seccion>('resumen');
  const [metricas, setMetricas] = useState<DashboardAdmin | null>(null);
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAdmin[]>([]);
  const [grupos, setGrupos] = useState<GrupoAdmin[]>([]);
  const [personal, setPersonal] = useState<UsuarioSucursal[]>([]);
  const [cortes, setCortes] = useState<CorteCaja[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [productoEditado, setProductoEditado] = useState<ProductoAdmin | null | undefined>(undefined);
  const [altaUsuario, setAltaUsuario] = useState(false);
  const [anular, setAnular] = useState<VentaResumen | null>(null);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const [resumen, menu, cats, extras, equipo, cierres] = await Promise.all([
        metricasSucursal(),
        listarProductosAdmin(),
        listarCategoriasAdmin(),
        listarModificadoresAdmin(),
        listarPersonal(),
        listarCortes(),
      ]);
      setMetricas(resumen);
      setProductos(menu);
      setCategorias(cats);
      setGrupos(extras);
      setPersonal(equipo);
      setCortes(cierres);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return;
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el panel.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vigente = true;
    Promise.all([metricasSucursal(), listarProductosAdmin(), listarCategoriasAdmin(), listarModificadoresAdmin(), listarPersonal(), listarCortes()])
      .then(([resumen, menu, cats, extras, equipo, cierres]) => {
        if (!vigente) return;
        setMetricas(resumen);
        setProductos(menu);
        setCategorias(cats);
        setGrupos(extras);
        setPersonal(equipo);
        setCortes(cierres);
        setCargando(false);
      })
      .catch((caught: unknown) => {
        if (!vigente || (caught instanceof ApiError && caught.status === 401)) return;
        setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el panel.');
        setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  function salir() {
    cerrarSesion();
    onCerrarSesion();
  }

  const negocio = metricas?.nombreComercial ?? 'Mi sucursal';

  return (
    <div className="min-h-dvh bg-ink md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-line px-4 py-4 md:border-r md:border-b-0 md:px-5 md:py-6">
        <div className="flex items-center gap-3">
          <LogoEmpresa src={metricas?.logoUrl} nombre={negocio} />
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-amber">{MARCA}</p>
            <h1 className="mt-1 text-xl font-semibold">{negocio}</h1>
          </div>
        </div>
        <nav className="mt-4 flex gap-2 md:mt-8 md:flex-col">
          <Tab activo={seccion === 'resumen'} onClick={() => setSeccion('resumen')}>
            Resumen
          </Tab>
          <Tab activo={seccion === 'reportes'} onClick={() => setSeccion('reportes')}>
            Reportes
          </Tab>
          <Tab activo={seccion === 'menu'} onClick={() => setSeccion('menu')}>
            Menú
          </Tab>
          <Tab activo={seccion === 'personal'} onClick={() => setSeccion('personal')}>
            Personal
          </Tab>
          <Tab activo={seccion === 'cortes'} onClick={() => setSeccion('cortes')}>
            Cortes
          </Tab>
          <Tab activo={seccion === 'ticket'} onClick={() => setSeccion('ticket')}>
            Ticket
          </Tab>
        </nav>
        <div className="mt-4 flex gap-2 md:mt-8 md:flex-col">
          <Link to="/caja" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-line px-4">
            Abrir caja
          </Link>
          <button type="button" className="min-h-11 rounded-2xl border border-line px-4" onClick={salir}>
            Salir
          </button>
        </div>
      </aside>

      <main className="px-4 py-5 md:px-6">
        {sesion && <VentasRechazadas tenantId={sesion.tenantId} />}
        {cargando && (
          <div className="grid gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Cargando el panel">
            {Array.from({ length: 3 }, (_, indice) => (
              <div key={indice} className="h-28 animate-pulse rounded-3xl border border-line bg-panel" />
            ))}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-chili/40 bg-chili/10 p-4">
            <p>{error}</p>
            <button type="button" className="mt-3 min-h-11 rounded-2xl border border-line px-4" onClick={() => void cargar()}>
              Reintentar
            </button>
          </div>
        )}
        {!cargando && !error && seccion === 'resumen' && metricas && <Resumen metricas={metricas} onAnular={setAnular} />}
        {!cargando && !error && seccion === 'reportes' && <ReportesPanel />}
        {!cargando && !error && seccion === 'ticket' && <TicketPanel />}
        {!cargando && !error && seccion === 'menu' && (
          <Menu
            productos={productos}
            onNuevo={() => setProductoEditado(null)}
            onEditar={setProductoEditado}
            onCambio={cargar}
          />
        )}
        {!cargando && !error && seccion === 'personal' && metricas && (
          <Personal equipo={personal} maxCajas={metricas.maxCajas} maxMeseros={metricas.maxMeseros} onNuevo={() => setAltaUsuario(true)} />
        )}
        {!cargando && !error && seccion === 'cortes' && <Cortes cortes={cortes} />}
      </main>

      {productoEditado !== undefined && (
        <ProductoModal
          producto={productoEditado}
          categorias={categorias}
          grupos={grupos}
          onCerrar={() => setProductoEditado(undefined)}
          onGuardado={async () => {
            setProductoEditado(undefined);
            await cargar();
          }}
        />
      )}
      {anular && (
        <AnularVenta
          venta={anular}
          onCerrar={() => setAnular(null)}
          onLista={async () => {
            setAnular(null);
            await cargar();
          }}
        />
      )}
      {altaUsuario && (
        <UsuarioModal
          onCerrar={() => setAltaUsuario(false)}
          onGuardado={async () => {
            setAltaUsuario(false);
            await cargar();
          }}
        />
      )}
    </div>
  );
}

function Resumen({ metricas, onAnular }: { metricas: DashboardAdmin; onAnular: (venta: VentaResumen) => void }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">Hoy</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Tarjeta etiqueta="Ventas del día" valor={moneda.format(metricas.ventasDelDia)} />
        <Tarjeta etiqueta="Órdenes cobradas" valor={String(metricas.ordenesDelDia)} />
        <Tarjeta etiqueta="Ticket promedio" valor={moneda.format(metricas.ticketPromedio)} />
        <Tarjeta etiqueta="Efectivo" valor={moneda.format(metricas.efectivo)} />
        <Tarjeta etiqueta="Tarjeta" valor={moneda.format(metricas.tarjeta)} />
        <Tarjeta etiqueta="Transferencia" valor={moneda.format(metricas.transferencia)} />
      </div>
      <h3 className="mt-8 text-lg font-semibold">Últimas ventas</h3>
      <ListaVentas ventas={metricas.ultimasVentas} onAnular={onAnular} vacio="Todavía no hay ventas registradas." />
    </section>
  );
}

function Menu({
  productos,
  onNuevo,
  onEditar,
  onCambio,
}: {
  productos: ProductoAdmin[];
  onNuevo: () => void;
  onEditar: (producto: ProductoAdmin) => void;
  onCambio: () => Promise<void>;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const visibles = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    if (!consulta) return productos;
    return productos.filter((producto) => producto.nombre.toLowerCase().includes(consulta));
  }, [busqueda, productos]);

  async function alternar(producto: ProductoAdmin) {
    setOcupadoId(producto.id);
    try {
      await editarProductoAdmin(producto.id, cuerpoDe(producto, { disponible: !producto.disponible }));
      toast.success(producto.disponible ? 'Producto marcado como agotado' : 'Producto disponible');
      await onCambio();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo cambiar la disponibilidad.');
    } finally {
      setOcupadoId(null);
    }
  }

  async function eliminar(producto: ProductoAdmin) {
    if (!window.confirm(`¿Eliminar ${producto.nombre}?`)) return;
    setOcupadoId(producto.id);
    try {
      await eliminarProductoAdmin(producto.id);
      toast.success('Producto eliminado');
      await onCambio();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo eliminar el producto.');
    } finally {
      setOcupadoId(null);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Menú</h2>
        <p className="mt-1 text-sm text-muted">Si lo marcas agotado, deja de aparecer en la caja al actualizar el menú.</p>
        <button type="button" className="min-h-11 rounded-2xl bg-amber px-4 font-semibold text-ink" onClick={onNuevo}>
          Nuevo producto
        </button>
      </div>
      <input
        value={busqueda}
        onChange={(event) => setBusqueda(event.target.value)}
        placeholder="Buscar producto"
        aria-label="Buscar producto"
        className="mt-4 min-h-12 w-full max-w-xl rounded-2xl border border-line bg-panel px-4 outline-none focus:border-amber"
      />
      {visibles.length === 0 ? (
        <p className="mt-6 text-muted">No hay productos para mostrar.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((producto) => (
            <article key={producto.id} className="overflow-hidden rounded-3xl border border-line bg-panel">
              {producto.fotoUrl && <img src={producto.fotoUrl} alt="" className="h-36 w-full object-cover" />}
              <div className="flex items-start justify-between gap-3 p-4 pb-0">
                <div>
                  <p className="font-medium">{producto.nombre}</p>
                  <p className="text-sm text-muted">{producto.categoriaNombre}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm ${producto.disponible ? 'bg-leaf/15 text-leaf' : 'bg-chili/15 text-chili'}`}>
                  {producto.disponible ? 'Disponible' : 'Agotado'}
                </span>
              </div>
              <p className="mt-3 px-4 text-lg font-semibold text-amber">{moneda.format(producto.precioBase)}</p>
              {producto.grupos.length > 0 && (
                <p className="mt-1 px-4 text-sm text-muted">{producto.grupos.map((grupo) => grupo.nombre).join(', ')}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 p-4 pt-0">
                <button type="button" className="min-h-10 rounded-xl border border-line px-3 text-sm" onClick={() => onEditar(producto)}>
                  Editar
                </button>
                <button
                  type="button"
                  disabled={ocupadoId === producto.id}
                  className="min-h-10 rounded-xl border border-line px-3 text-sm disabled:opacity-50"
                  onClick={() => void alternar(producto)}
                >
                  {producto.disponible ? 'Agotar' : 'Activar'}
                </button>
                <button
                  type="button"
                  disabled={ocupadoId === producto.id}
                  className="min-h-10 rounded-xl border border-line px-3 text-sm text-chili disabled:opacity-50"
                  onClick={() => void eliminar(producto)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Cortes({ cortes }: { cortes: CorteCaja[] }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">Cortes de caja</h2>
      {cortes.length === 0 ? (
        <p className="mt-6 text-muted">Todavía no hay cierres de turno.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-3xl border border-line">
          <table className="min-w-[760px] w-full text-left">
            <thead className="bg-panel text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cajero</th>
                <th className="px-4 py-3 font-medium">Esperado</th>
                <th className="px-4 py-3 font-medium">Contado</th>
                <th className="px-4 py-3 font-medium">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {cortes.map((corte) => (
                <tr key={corte.id} className="border-t border-line">
                  <td className="px-4 py-3">{formatoFechaHora(corte.fechaCorte)}</td>
                  <td className="px-4 py-3">{corte.cajero}</td>
                  <td className="px-4 py-3">{moneda.format(corte.efectivoEsperado)}</td>
                  <td className="px-4 py-3">{moneda.format(corte.efectivoContado)}</td>
                  <td className="px-4 py-3">
                    <ResultadoArqueo diferencia={corte.diferencia} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Personal({
  equipo,
  maxCajas,
  maxMeseros,
  onNuevo,
}: {
  equipo: UsuarioSucursal[];
  maxCajas: number;
  maxMeseros: number;
  onNuevo: () => void;
}) {
  const cajas = equipo.filter((persona) => persona.rol === 'Cajero').length;
  const meseros = equipo.filter((persona) => persona.rol === 'Mesero').length;
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Personal</h2>
          <p className="mt-1 text-sm text-muted">
            Cajas {cajas} de {maxCajas}. Meseros {meseros} de {maxMeseros}.
          </p>
        </div>
        <button type="button" className="min-h-11 rounded-2xl bg-amber px-4 font-semibold text-ink" onClick={onNuevo}>
          Crear usuario
        </button>
      </div>
      {equipo.length === 0 ? (
        <p className="mt-6 text-muted">Todavía no hay cajeros ni meseros.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-3xl border border-line">
          <table className="min-w-[520px] w-full text-left">
            <thead className="bg-panel text-sm text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Rol</th>
              </tr>
            </thead>
            <tbody>
              {equipo.map((persona) => (
                <tr key={persona.id} className="border-t border-line">
                  <td className="px-4 py-3">{persona.nombre}</td>
                  <td className="px-4 py-3">{persona.username}</td>
                  <td className="px-4 py-3">{persona.rol === 'Cajero' ? 'Cajero' : 'Mesero'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ProductoModal({
  producto,
  categorias,
  grupos,
  onCerrar,
  onGuardado,
}: {
  producto: ProductoAdmin | null;
  categorias: CategoriaAdmin[];
  grupos: GrupoAdmin[];
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState(producto?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? '');
  const [categoriaId, setCategoriaId] = useState(producto?.categoriaId ?? categorias[0]?.id ?? '');
  const [precio, setPrecio] = useState(producto ? String(producto.precioBase) : '');
  const [foto, setFoto] = useState(producto?.fotoUrl ?? '');
  const [disponible, setDisponible] = useState(producto?.disponible ?? true);
  const [seleccionados, setSeleccionados] = useState<string[]>(producto?.grupos.map((grupo) => grupo.id) ?? []);
  const [guardando, setGuardando] = useState(false);

  function alternarGrupo(id: string) {
    setSeleccionados((actuales) => (actuales.includes(id) ? actuales.filter((item) => item !== id) : [...actuales, id]));
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const precioBase = Number(precio);
    if (!Number.isFinite(precioBase) || precioBase < 0) {
      toast.error('Indica un precio válido.');
      return;
    }
    setGuardando(true);
    const body = {
      nombre,
      descripcion,
      categoriaId,
      precioBase,
      fotoUrl: foto,
      disponible,
      gruposModificadorIds: seleccionados,
    };
    try {
      if (producto) await editarProductoAdmin(producto.id, body);
      else await crearProductoAdmin(body);
      toast.success(producto ? 'Producto actualizado' : 'Producto creado');
      await onGuardado();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo guardar el producto.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={producto ? 'Editar producto' : 'Nuevo producto'} onCerrar={onCerrar}>
      <form onSubmit={enviar} className="grid gap-3">
        <Campo id="prod-nombre" etiqueta="Nombre" value={nombre} onChange={setNombre} required />
        <Campo id="prod-desc" etiqueta="Descripción" value={descripcion} onChange={setDescripcion} />
        <div>
          <label className="text-sm text-muted" htmlFor="prod-cat">
            Categoría
          </label>
          <select
            id="prod-cat"
            value={categoriaId}
            required
            onChange={(event) => setCategoriaId(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3"
          >
            {categorias.length === 0 && <option value="">Sin categorías</option>}
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </div>
        <Campo id="prod-precio" etiqueta="Precio base" value={precio} onChange={setPrecio} type="number" required />
        <FotoProducto valor={foto} onChange={setFoto} />
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" checked={disponible} onChange={(event) => setDisponible(event.target.checked)} />
          Disponible para la venta
        </label>
        {grupos.length > 0 && (
          <fieldset>
            <legend className="text-sm text-muted">Modificadores y extras</legend>
            <div className="mt-2 grid gap-2">
              {grupos.map((grupo) => (
                <label key={grupo.id} className="flex min-h-11 items-center gap-3 rounded-2xl border border-line px-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(grupo.id)}
                    onChange={() => alternarGrupo(grupo.id)}
                  />
                  <span>
                    {grupo.nombre}
                    <span className="text-muted"> · máx. {grupo.seleccionMaxima}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="min-h-12 rounded-2xl border border-line px-4" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando || categorias.length === 0} className="min-h-12 rounded-2xl bg-amber px-4 font-semibold text-ink disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UsuarioModal({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => Promise<void> }) {
  const [nombre, setNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'Cajero' | 'Mesero'>('Cajero');
  const [guardando, setGuardando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      await crearPersonal({ nombre, username, password, rol });
      toast.success('Usuario creado');
      await onGuardado();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo crear el usuario.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Crear usuario" onCerrar={onCerrar}>
      <form onSubmit={enviar} className="grid gap-3">
        <Campo id="user-nombre" etiqueta="Nombre" value={nombre} onChange={setNombre} required />
        <Campo id="user-username" etiqueta="Usuario" value={username} onChange={setUsername} required />
        <Campo id="user-pass" etiqueta="Contraseña" value={password} onChange={setPassword} type="password" required />
        <div>
          <label className="text-sm text-muted" htmlFor="user-rol">
            Rol
          </label>
          <select
            id="user-rol"
            value={rol}
            onChange={(event) => setRol(event.target.value === 'Mesero' ? 'Mesero' : 'Cajero')}
            className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3"
          >
            <option value="Cajero">Cajero</option>
            <option value="Mesero">Mesero</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="min-h-12 rounded-2xl border border-line px-4" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="min-h-12 rounded-2xl bg-amber px-4 font-semibold text-ink disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FotoProducto({ valor, onChange }: { valor: string; onChange: (valor: string) => void }) {
  const [leyendo, setLeyendo] = useState(false);

  async function elegir(archivo: File | undefined) {
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      toast.error('Elige una imagen PNG, JPG o WebP.');
      return;
    }
    setLeyendo(true);
    try {
      onChange(await reducirLogo(archivo, 720));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'No se pudo leer la foto.');
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-muted">Foto del producto</p>
      {valor && <img src={valor} alt="" className="mt-2 h-36 w-full rounded-2xl object-cover" />}
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-2xl bg-amber px-4 font-semibold text-ink">
          Tomar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              void elegir(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-2xl border border-line px-4">
          Cargar imagen
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              void elegir(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        {valor && (
          <button type="button" className="min-h-11 rounded-2xl border border-line px-4 text-sm" onClick={() => onChange('')}>
            Quitar foto
          </button>
        )}
      </div>
      {leyendo && <p className="mt-2 text-sm text-muted">Preparando foto…</p>}
    </div>
  );
}

function cuerpoDe(producto: ProductoAdmin, cambios: Partial<{ disponible: boolean }>) {
  return {
    nombre: producto.nombre,
    descripcion: producto.descripcion ?? '',
    categoriaId: producto.categoriaId,
    precioBase: producto.precioBase,
    fotoUrl: producto.fotoUrl ?? '',
    disponible: cambios.disponible ?? producto.disponible,
    gruposModificadorIds: producto.grupos.map((grupo) => grupo.id),
  };
}

function Tab({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 flex-1 rounded-2xl px-3 text-left md:flex-none ${activo ? 'bg-amber font-semibold text-ink' : 'border border-line'}`}
    >
      {children}
    </button>
  );
}

function Tarjeta({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <article className="rounded-3xl border border-line bg-panel p-4">
      <p className="text-sm text-muted">{etiqueta}</p>
      <p className="mt-2 text-2xl font-semibold">{valor}</p>
    </article>
  );
}

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-panel p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold">{titulo}</h2>
          <button type="button" className="min-h-10 px-2 text-sm text-muted" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  id: string;
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm text-muted" htmlFor={id}>
        {etiqueta}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? '0.01' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3 outline-none focus:border-amber"
      />
    </div>
  );
}
