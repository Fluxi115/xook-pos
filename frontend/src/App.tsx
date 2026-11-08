import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AdminPage } from './features/admin/AdminPage';
import { AuthProvider, useAuth } from './features/auth/sesion';
import { Login } from './features/auth/Login';
import { PantallaCarga } from './features/auth/PantallaCarga';
import { PosView } from './features/pos/PosView';
import { EmpresaPage } from './features/empresa/EmpresaPage';
import { SuperAdminPage } from './features/superadmin/SuperAdminPage';

function rutaDeRol(rol: string) {
  if (rol === 'SuperAdmin') return '/superadmin';
  if (rol === 'AdminEmpresa') return '/empresa';
  if (rol === 'AdminSucursal') return '/admin';
  return '/caja';
}

export default function App() {
  const [presentando, setPresentando] = useState(true);

  useEffect(() => {
    const espera = window.setTimeout(() => setPresentando(false), 1700);
    return () => window.clearTimeout(espera);
  }, []);

  if (presentando) return <PantallaCarga />;

  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" theme="dark" richColors />
        <Routes>
          <Route path="/" element={<RutaInicio />} />
          <Route path="/caja" element={<RutaCaja />} />
          <Route path="/admin" element={<RutaAdmin />} />
          <Route path="/empresa" element={<RutaEmpresa />} />
          <Route path="/superadmin" element={<RutaSuperAdmin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function RutaInicio() {
  const { sesion, setSesion } = useAuth();
  if (!sesion) return <Login onSesion={setSesion} />;
  return <Navigate to={rutaDeRol(sesion.rol)} replace />;
}

function RutaCaja() {
  const { sesion, setSesion, enLinea } = useAuth();
  if (!sesion) return <Navigate to="/" replace />;
  if (sesion.rol === 'SuperAdmin' || sesion.rol === 'AdminEmpresa') return <Navigate to={rutaDeRol(sesion.rol)} replace />;
  return <PosView sesion={sesion} enLinea={enLinea} onCerrarSesion={() => setSesion(null)} />;
}

function RutaSuperAdmin() {
  const { sesion, setSesion } = useAuth();
  if (!sesion) return <Navigate to="/" replace />;
  if (sesion.rol !== 'SuperAdmin') return <Navigate to={rutaDeRol(sesion.rol)} replace />;
  return <SuperAdminPage onCerrarSesion={() => setSesion(null)} />;
}

function RutaEmpresa() {
  const { sesion, setSesion } = useAuth();
  if (!sesion) return <Navigate to="/" replace />;
  if (sesion.rol !== 'AdminEmpresa') return <Navigate to={rutaDeRol(sesion.rol)} replace />;
  return <EmpresaPage onCerrarSesion={() => setSesion(null)} />;
}

function RutaAdmin() {
  const { sesion, setSesion } = useAuth();
  if (!sesion) return <Navigate to="/" replace />;
  if (sesion.rol !== 'AdminSucursal') return <Navigate to={rutaDeRol(sesion.rol)} replace />;
  return <AdminPage onCerrarSesion={() => setSesion(null)} />;
}
