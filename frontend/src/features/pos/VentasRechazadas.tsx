import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';

export function VentasRechazadas({ tenantId }: { tenantId: string }) {
  const rechazadas = useLiveQuery(() => db.ventasPendientes.filter((venta) => venta.estado === 'rechazada').toArray(), [tenantId]);
  const propias = (rechazadas ?? []).filter((venta) => !venta.tenantId || venta.tenantId === tenantId);
  if (propias.length === 0) return null;

  return (
    <div role="alert" className="mb-4 rounded-2xl border border-orange/50 bg-orange/15 px-4 py-3 text-sm">
      <p className="font-semibold text-orange">Ventas rechazadas</p>
      <ul className="mt-1 space-y-1">
        {propias.map((venta) => (
          <li key={venta.id}>
            {venta.payloadCompleto?.folioVenta ?? venta.id}: {venta.error ?? 'El servidor rechazó la venta.'}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-muted">No se reintentan y no impiden el cierre Z.</p>
    </div>
  );
}
