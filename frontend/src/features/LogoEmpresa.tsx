export function LogoEmpresa({ src, nombre, className = 'h-12 w-12' }: { src?: string | null; nombre: string; className?: string }) {
  if (!src) return null;
  return <img src={src} alt={`Logo de ${nombre}`} className={`${className} shrink-0 rounded-2xl bg-ink object-contain`} />;
}
