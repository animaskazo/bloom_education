import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage       from '@/pages/LoginPage'
import DashboardPage   from '@/pages/DashboardPage'
import PersonalPage    from '@/pages/PersonalPage'
import EstudiantesPage from '@/pages/EstudiantesPage'
import CursosPage      from '@/pages/CursosPage'
import ComunicadosPage from '@/pages/ComunicadosPage'
import PadresPage      from '@/pages/PadresPage'
import PagosPage       from '@/pages/PagosPage'
import ProveedoresPage from '@/pages/ProveedoresPage'
import ConfiguracionPage from '@/pages/ConfiguracionPage'
import EstablecimientosPage from '@/pages/EstablecimientosPage'
import AsistenciaPage from '@/pages/AsistenciaPage'
import { Spinner } from '@/components/ui'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="w-8 h-8 text-brand-500" />
        <p className="text-sm text-slate-400">Cargando Bloom...</p>
      </div>
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? <>{children}</> : <Navigate to="/" replace />
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { perfil, loading } = useAuth()
  if (loading) return null
  return perfil?.rol === 'super_admin' ? <>{children}</> : <Navigate to="/" replace />
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { perfil, loading } = useAuth()
  if (loading) return null
  const allowed = ['super_admin', 'direccion', 'administrativo', 'profesor']
  return perfil && allowed.includes(perfil.rol) ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { perfil, loading } = useAuth()
  if (loading) return null
  const allowed = ['super_admin', 'direccion']
  return perfil && allowed.includes(perfil.rol) ? <>{children}</> : <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index         element={<DashboardPage />} />
        <Route path="personal"    element={<AdminOnlyRoute><PersonalPage /></AdminOnlyRoute>} />
        <Route path="estudiantes" element={<AdminOnlyRoute><EstudiantesPage /></AdminOnlyRoute>} />
        <Route path="cursos"      element={<StaffRoute><CursosPage /></StaffRoute>} />
        <Route path="asistencia"  element={<StaffRoute><AsistenciaPage /></StaffRoute>} />
        <Route path="comunicados" element={<StaffRoute><ComunicadosPage /></StaffRoute>} />
        <Route path="padres"      element={<AdminOnlyRoute><PadresPage /></AdminOnlyRoute>} />
        <Route path="pagos"       element={<AdminOnlyRoute><PagosPage /></AdminOnlyRoute>} />
        <Route path="proveedores" element={<AdminOnlyRoute><ProveedoresPage /></AdminOnlyRoute>} />
        <Route path="configuracion" element={<StaffRoute><ConfiguracionPage /></StaffRoute>} />
        <Route path="establecimientos" element={<SuperAdminRoute><EstablecimientosPage /></SuperAdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
