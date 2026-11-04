import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { leerSesion, observarSesion, type Sesion } from '../../services/apiClient';
import { iniciarColaSincronizacion } from '../../services/syncService';

interface AuthState {
  sesion: Sesion | null;
  setSesion: (sesion: Sesion | null) => void;
  enLinea: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => leerSesion());
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);

  useEffect(() => observarSesion(setSesion), []);

  useEffect(() => iniciarColaSincronizacion(), []);

  useEffect(() => {
    const conectar = () => setEnLinea(true);
    const desconectar = () => setEnLinea(false);
    window.addEventListener('online', conectar);
    window.addEventListener('offline', desconectar);
    return () => {
      window.removeEventListener('online', conectar);
      window.removeEventListener('offline', desconectar);
    };
  }, []);

  return <AuthContext.Provider value={{ sesion, setSesion, enLinea }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const valor = useContext(AuthContext);
  if (!valor) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return valor;
}
