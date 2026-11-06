import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MARCA } from '../../marca';
import { LogoEmpresa } from '../LogoEmpresa';
import { reducirLogo } from '../logo';
import { ApiError, cerrarSesion } from '../../services/apiClient';
import {
  actualizarSuscripcion,
  crearTenant,
  editarTenant,
  fechaDesdeHoy,
  fechaInicial,
  finDeDiaUtc,
  listarTenants,
  renovarDesde,
  semaforo,
  type Semaforo,
  type TenantAdmin,
} from '../../services/superadminApi';

const fecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' });

const ETIQUETA: Record<Semaforo, string> = {
  activo: 'Activo',
  'por-vencer': 'Por vencer',
  bloqueado: 'Vencido / Inactivo',
};

const COLOR: Record<Semaforo, string> = {
  activo: 'bg-leaf/15 text-leaf',
  'por-vencer': 'bg-amber/15 text-amber',
  bloqueado: 'bg-chili/15 text-chili',
};

interface SuperAdminPageProps {
  onCerrarSesion: () => void;
}

export function SuperAdminPage({ onCerrarSesion }: SuperAdminPageProps) {
  const [tenants, setTenants] = useState<TenantAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [edicion, setEdicion] = useState<TenantAdmin | null>(null);
  const [renovacion, setRenovacion] = useState<TenantAdmin | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      setTenants(await listarTenants());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el panel.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    let vigente = true;
    listarTenants()
      .then((lista) => {
        if (!vigente) return;
        setTenants(lista);
        setCargando(false);
      })
      .catch((caught: unknown) => {
        if (!vigente) return;
        setError(caught instanceof ApiError ? caught.message : 'No se pudo cargar el panel.');
        setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const visibles = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    if (!consulta) return tenants;
    return tenants.filter((tenant) =>
      [tenant.nombreComercial, tenant.rucRfc, tenant.telefono ?? ''].join(' ').toLowerCase().includes(consulta),
    );
  }, [busqueda, tenants]);

  function salir() {
    cerrarSesion();
    onCerrarSesion();
  }

  async function alternarAcceso(tenant: TenantAdmin) {
    setOcupadoId(tenant.id);
    try {
      const estado = tenant.estado === 'Activo' ? 'Inactivo' : 'Activo';
      await actualizarSuscripcion(tenant.id, { fechaVencimiento: tenant.fechaVencimiento, estado });
      toast.success(estado === 'Activo' ? 'Acceso activado' : 'Acceso desactivado');
      await cargar();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo cambiar el acceso.');
    } finally {
      setOcupadoId(null);
    }
  }

  return (
    <div className="min-h-dvh bg-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 md:px-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-amber">{MARCA}</p>
          <h1 className="text-2xl font-semibold">Sucursales</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-2xl bg-amber px-4 font-semibold text-ink" onClick={() => setAltaAbierta(true)}>
            Nuevo cliente
          </button>
          <Link to="/caja" className="inline-flex min-h-11 items-center rounded-2xl border border-line px-4">
            Abrir caja
          </Link>
          <button type="button" className="min-h-11 rounded-2xl border border-line px-4" onClick={salir}>
            Salir
          </button>
        </div>
      </header>

      <main className="px-4 py-5 md:px-6">
        <input
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          placeholder="Buscar por nombre, RFC o teléfono"
          aria-label="Buscar sucursal"
          className="mb-4 min-h-12 w-full max-w-xl rounded-2xl border border-line bg-panel px-4 outline-none focus:border-amber"
        />

        {cargando && <p className="text-muted">Cargando sucursales…</p>}
        {error && (
          <div className="rounded-2xl border border-chili/40 bg-chili/10 p-4">
            <p>{error}</p>
            <button type="button" className="mt-3 min-h-11 rounded-2xl border border-line px-4" onClick={() => void cargar()}>
              Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && visibles.length === 0 && <p className="text-muted">No hay sucursales para mostrar.</p>}

        {!cargando && !error && visibles.length > 0 && (
          <div className="overflow-x-auto rounded-3xl border border-line">
            <table className="min-w-[860px] w-full border-collapse text-left">
              <thead className="bg-panel text-sm text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Negocio</th>
                  <th className="px-4 py-3 font-medium">RFC / RUC</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Usuarios</th>
                  <th className="px-4 py-3 font-medium">Vence</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((tenant) => {
                  const luz = semaforo(tenant);
                  return (
                    <tr key={tenant.id} className="border-t border-line">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-3">
                          <LogoEmpresa src={tenant.logoUrl} nombre={tenant.nombreComercial} className="h-10 w-10" />
                          {tenant.nombreComercial}
                        </div>
                      </td>
                      <td className="px-4 py-3">{tenant.rucRfc}</td>
                      <td className="px-4 py-3">{tenant.telefono || '—'}</td>
                      <td className="px-4 py-3">{tenant.totalUsuarios}</td>
                      <td className="px-4 py-3">{fecha.format(new Date(tenant.fechaVencimiento))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${COLOR[luz]}`}>
                          <span className="h-2.5 w-2.5 rounded-full bg-current" />
                          {ETIQUETA[luz]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="min-h-10 rounded-xl border border-line px-3 text-sm" onClick={() => setRenovacion(tenant)}>
                            Renovar fecha
                          </button>
                          <button
                            type="button"
                            disabled={ocupadoId === tenant.id}
                            className="min-h-10 rounded-xl border border-line px-3 text-sm disabled:opacity-50"
                            onClick={() => void alternarAcceso(tenant)}
                          >
                            {tenant.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                          </button>
                          <button type="button" className="min-h-10 rounded-xl border border-line px-3 text-sm" onClick={() => setEdicion(tenant)}>
                            Editar datos
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {altaAbierta && (
        <AltaModal
          onCerrar={() => setAltaAbierta(false)}
          onLista={async () => {
            setAltaAbierta(false);
            await cargar();
          }}
        />
      )}
      {edicion && (
        <EditarModal
          tenant={edicion}
          onCerrar={() => setEdicion(null)}
          onLista={async () => {
            setEdicion(null);
            await cargar();
          }}
        />
      )}
      {renovacion && (
        <RenovarModal
          tenant={renovacion}
          onCerrar={() => setRenovacion(null)}
          onLista={async () => {
            setRenovacion(null);
            await cargar();
          }}
        />
      )}
    </div>
  );
}

function AltaModal({ onCerrar, onLista }: { onCerrar: () => void; onLista: () => Promise<void> }) {
  const [nombre, setNombre] = useState('');
  const [rfc, setRfc] = useState('');
  const [telefono, setTelefono] = useState('');
  const [logo, setLogo] = useState('');
  const [adminNombre, setAdminNombre] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [vence, setVence] = useState(() => fechaInicial(12));
  const [guardando, setGuardando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      await crearTenant({
        nombreComercial: nombre,
        rucRfc: rfc,
        telefono,
        logoUrl: logo,
        fechaVencimiento: finDeDiaUtc(vence),
        adminNombre,
        adminUsername: username,
        adminPassword: password,
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
    <Modal titulo="Dar de alta nuevo cliente" onCerrar={onCerrar}>
      <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
        <Campo id="alta-nombre" etiqueta="Nombre comercial" value={nombre} onChange={setNombre} required />
        <Campo id="alta-rfc" etiqueta="RFC / RUC" value={rfc} onChange={setRfc} required />
        <Campo id="alta-tel" etiqueta="Teléfono" value={telefono} onChange={setTelefono} />
        <LogoCampo id="alta-logo" valor={logo} onChange={setLogo} />
        <Campo id="alta-admin" etiqueta="Nombre del administrador" value={adminNombre} onChange={setAdminNombre} required />
        <Campo id="alta-user" etiqueta="Usuario" value={username} onChange={setUsername} required />
        <Campo id="alta-pass" etiqueta="Contraseña" value={password} onChange={setPassword} type="password" required />
        <div>
          <label className="text-sm text-muted" htmlFor="alta-vence">
            Vencimiento inicial
          </label>
          <input
            id="alta-vence"
            type="date"
            value={vence}
            onChange={(event) => setVence(event.target.value)}
            required
            className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Preset onClick={() => setVence(fechaDesdeHoy(30))}>30 días</Preset>
            <Preset onClick={() => setVence(fechaInicial(6))}>6 meses</Preset>
            <Preset onClick={() => setVence(fechaInicial(12))}>1 año</Preset>
          </div>
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="min-h-12 rounded-2xl border border-line px-4" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="min-h-12 rounded-2xl bg-amber px-4 font-semibold text-ink disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Crear sucursal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditarModal({
  tenant,
  onCerrar,
  onLista,
}: {
  tenant: TenantAdmin;
  onCerrar: () => void;
  onLista: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState(tenant.nombreComercial);
  const [rfc, setRfc] = useState(tenant.rucRfc);
  const [telefono, setTelefono] = useState(tenant.telefono ?? '');
  const [logo, setLogo] = useState(tenant.logoUrl ?? '');
  const [guardando, setGuardando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      await editarTenant(tenant.id, { nombreComercial: nombre, rucRfc: rfc, telefono, logoUrl: logo });
      toast.success('Datos actualizados');
      await onLista();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudieron guardar los datos.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Editar datos" onCerrar={onCerrar}>
      <form onSubmit={enviar} className="grid gap-3">
        <Campo id="edit-nombre" etiqueta="Nombre comercial" value={nombre} onChange={setNombre} required />
        <Campo id="edit-rfc" etiqueta="RFC / RUC" value={rfc} onChange={setRfc} required />
        <Campo id="edit-tel" etiqueta="Teléfono" value={telefono} onChange={setTelefono} />
        <LogoCampo id="edit-logo" valor={logo} onChange={setLogo} />
        <div className="flex justify-end gap-2">
          <button type="button" className="min-h-12 rounded-2xl border border-line px-4" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="min-h-12 rounded-2xl bg-amber px-4 font-semibold text-ink disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RenovarModal({
  tenant,
  onCerrar,
  onLista,
}: {
  tenant: TenantAdmin;
  onCerrar: () => void;
  onLista: () => Promise<void>;
}) {
  const [vence, setVence] = useState(() => renovarDesde(tenant.fechaVencimiento, 1));
  const [guardando, setGuardando] = useState(false);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      await actualizarSuscripcion(tenant.id, {
        fechaVencimiento: finDeDiaUtc(vence),
        estado: 'Activo',
      });
      toast.success('Suscripción renovada');
      await onLista();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo renovar la suscripción.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Registrar pago / renovar suscripción" onCerrar={onCerrar}>
      <form onSubmit={enviar} className="grid gap-3">
        <p className="text-sm text-muted">
          {tenant.nombreComercial}. La nueva fecha deja el acceso en Activo.
        </p>
        <label className="text-sm text-muted" htmlFor="renovar-fecha">
          Nueva fecha límite
        </label>
        <input
          id="renovar-fecha"
          type="date"
          value={vence}
          required
          onChange={(event) => setVence(event.target.value)}
          className="min-h-12 rounded-2xl border border-line bg-ink px-3"
        />
        <div className="flex flex-wrap gap-2">
          <Preset onClick={() => setVence(renovarDesde(tenant.fechaVencimiento, 1))}>1 mes</Preset>
          <Preset onClick={() => setVence(renovarDesde(tenant.fechaVencimiento, 12))}>1 año</Preset>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="min-h-12 rounded-2xl border border-line px-4" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className="min-h-12 rounded-2xl bg-amber px-4 font-semibold text-ink disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Confirmar renovación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3 sm:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-panel p-5">
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

function LogoCampo({ id, valor, onChange }: { id: string; valor: string; onChange: (valor: string) => void }) {
  const [leyendo, setLeyendo] = useState(false);

  async function elegir(archivo: File | undefined) {
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      toast.error('Elige una imagen PNG, JPG o WebP.');
      return;
    }
    setLeyendo(true);
    try {
      onChange(await reducirLogo(archivo));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'No se pudo leer la imagen.');
    } finally {
      setLeyendo(false);
    }
  }

  return (
    <div className="sm:col-span-2">
      <label className="text-sm text-muted" htmlFor={id}>
        Logo de la empresa
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <LogoEmpresa src={valor} nombre="la empresa" className="h-16 w-16" />
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            void elegir(event.target.files?.[0]);
            event.target.value = '';
          }}
          className="max-w-full text-sm file:mr-3 file:min-h-11 file:rounded-2xl file:border-0 file:bg-amber file:px-4 file:font-semibold file:text-ink"
        />
        {valor && (
          <button type="button" className="min-h-11 rounded-2xl border border-line px-4 text-sm" onClick={() => onChange('')}>
            Quitar logo
          </button>
        )}
        {leyendo && <span className="text-sm text-muted">Preparando imagen…</span>}
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
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3 outline-none focus:border-amber"
      />
    </div>
  );
}

function Preset({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-10 rounded-full border border-line px-3 text-sm">
      {children}
    </button>
  );
}
