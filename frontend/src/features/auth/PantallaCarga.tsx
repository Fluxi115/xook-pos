import icono from '../../../../assets/XookPos_icon.png';

export function PantallaCarga({ mensaje = 'Preparando Xook POS' }: { mensaje?: string }) {
  return (
    <div className="xook-carga fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink">
      <div className="xook-halo" />
      <div className="relative flex w-full max-w-sm flex-col items-center px-6">
        <img src={icono} alt="" className="xook-icono h-28 w-auto" />
        <p className="mt-6 text-sm font-semibold tracking-[0.22em] text-cream">{mensaje}</p>
        <div className="mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-panel-2">
          <span className="xook-barra block h-full w-1/2 rounded-full bg-amber" />
        </div>
      </div>
    </div>
  );
}
