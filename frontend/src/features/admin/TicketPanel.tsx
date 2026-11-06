import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ApiError } from '../../services/apiClient';
import { guardarTicket, leerTicket } from '../../services/tenantAdminApi';

export function TicketPanel() {
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [porcentaje, setPorcentaje] = useState('0');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    leerTicket()
      .then((ticket) => {
        if (!vigente) return;
        setDireccion(ticket.direccion ?? '');
        setTelefono(ticket.telefono ?? '');
        setMensaje(ticket.mensajeTicket ?? '');
        setPorcentaje(String(Math.round(ticket.tasaImpuesto * 10000) / 100));
      })
      .catch((caught: unknown) => {
        if (!vigente) return;
        toast.error(caught instanceof ApiError ? caught.message : 'No se pudo cargar el ticket.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const tasa = Number(porcentaje);
    if (!Number.isFinite(tasa) || tasa < 0 || tasa > 100) {
      toast.error('El impuesto debe estar entre 0 y 100.');
      return;
    }
    setGuardando(true);
    try {
      await guardarTicket({
        direccion,
        telefono,
        mensajeTicket: mensaje,
        tasaImpuesto: Math.round(tasa * 100) / 10000,
      });
      toast.success('Ticket actualizado. La caja lo toma al actualizar el menú.');
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'No se pudo guardar el ticket.');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="text-muted">Cargando el ticket…</p>;

  return (
    <section className="max-w-xl">
      <h2 className="text-2xl font-semibold">Ticket</h2>
      <p className="mt-2 text-sm text-muted">Estos datos salen en el recibo de la caja. El impuesto se suma al cobrar.</p>
      <form onSubmit={enviar} className="mt-4 grid gap-3">
        <Campo id="ticket-direccion" etiqueta="Dirección" value={direccion} onChange={setDireccion} />
        <Campo id="ticket-telefono" etiqueta="Teléfono" value={telefono} onChange={setTelefono} />
        <Campo id="ticket-mensaje" etiqueta="Mensaje del recibo" value={mensaje} onChange={setMensaje} />
        <Campo id="ticket-impuesto" etiqueta="Impuesto (%)" value={porcentaje} onChange={setPorcentaje} type="number" />
        <button type="submit" disabled={guardando} className="min-h-12 rounded-2xl bg-amber px-4 font-semibold text-ink disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Guardar ticket'}
        </button>
      </form>
    </section>
  );
}

function Campo({
  id,
  etiqueta,
  value,
  onChange,
  type = 'text',
}: {
  id: string;
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm text-muted" htmlFor={id}>
        {etiqueta}
      </label>
      <input
        id={id}
        type={type}
        min={type === 'number' ? 0 : undefined}
        max={type === 'number' ? 100 : undefined}
        step={type === 'number' ? '0.01' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-ink px-3 outline-none focus:border-amber"
      />
    </div>
  );
}
