import { useState, type FormEvent } from 'react';
import { ApiError, type Sesion } from '../../services/apiClient';
import { iniciarSesion } from '../../services/syncService';
import { PantallaCarga } from './PantallaCarga';
import baner from '../../../../assets/XookPos_ban.png';
import icono from '../../../../assets/XookPos_icon.png';

const MENSAJE_SUSCRIPCION =
  'Tu suscripción ha vencido. Ponte en contacto con el administrador para reactivar tu cuenta.';

interface LoginProps {
  onSesion: (sesion: Sesion) => void;
}

export function Login({ onSesion }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [suscripcionVencida, setSuscripcionVencida] = useState(false);
  const [error, setError] = useState('');

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuscripcionVencida(false);
    setCargando(true);
    try {
      const sesion = await iniciarSesion(username, password);
      onSesion(sesion);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        setSuscripcionVencida(true);
      } else if (caught instanceof ApiError) {
        setError(caught.message);
      } else if (caught instanceof TypeError) {
        setError('Sin conexión con el servidor.');
      } else {
        setError('No se pudo iniciar sesión.');
      }
    } finally {
      setCargando(false);
    }
  }

  if (cargando) return <PantallaCarga mensaje="Entrando" />;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <img src={baner} alt="Xook POS, vende, controla y crece" className="h-52 w-full object-cover sm:h-72 lg:h-dvh" />
      <div className="flex items-center justify-center px-4 py-8">
      <form onSubmit={enviar} className="w-full max-w-md rounded-3xl border border-line bg-panel p-6 shadow-2xl sm:p-8">
        <img src={icono} alt="Xook POS" className="mx-auto h-20 w-auto" />
        <h1 className="mt-4 text-center text-3xl font-semibold">Entrar</h1>

        {suscripcionVencida && (
          <div role="alert" className="mt-6 rounded-2xl border-2 border-chili bg-chili/15 p-4">
            <p className="text-base font-semibold text-cream">Suscripción vencida</p>
            <p className="mt-1 text-sm leading-relaxed text-cream">{MENSAJE_SUSCRIPCION}</p>
          </div>
        )}

        <label className="mt-6 block text-sm text-muted" htmlFor="username">
          Usuario
        </label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-1 min-h-14 w-full rounded-2xl border border-line bg-ink px-4 text-base text-cream outline-none focus:border-amber"
          autoComplete="username"
          required
        />

        <label className="mt-4 block text-sm text-muted" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 min-h-14 w-full rounded-2xl border border-line bg-ink px-4 text-base text-cream outline-none focus:border-amber"
          autoComplete="current-password"
          required
        />

        {error && (
          <p role="alert" className="mt-4 text-sm text-chili">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="mt-6 min-h-14 w-full rounded-2xl bg-amber text-lg font-semibold text-ink active:scale-[0.99] disabled:opacity-60"
        >
          Entrar
        </button>
      </form>
      </div>
    </main>
  );
}
