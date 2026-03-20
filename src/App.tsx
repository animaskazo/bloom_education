import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import PersonalPage from '@/pages/PersonalPage'
import EstudiantesPage from '@/pages/EstudiantesPage'
import CursosPage from '@/pages/CursosPage'
import ComunicadosPage from '@/pages/ComunicadosPage'
import PadresPage from '@/pages/PadresPage'
import PagosPage from '@/pages/PagosPage'
import ProveedoresPage from '@/pages/ProveedoresPage'
import ConfiguracionPage from '@/pages/ConfiguracionPage'
import { Spinner } from '@/components/ui'
import AsistenciaPage from './pages/AsistenciaPage'

import EstablecimientosPage from '@/pages/EstablecimientosPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="w-8 h-8 text-brand-500" />
        <p className="text-sm text-slate-400">Cargando Bloom Education...</p>
      </div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, perfilLoading } = useAuth()
  if (loading || perfilLoading) return <LoadingScreen />
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  // Si ya está logueado lo manda al dashboard
  return !user ? <>{children}</> : <Navigate to="/dashboard" replace />
}

function AuthRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return <Navigate to={user ? '/dashboard' : '/login'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Privadas — mismo prefijo que usa el Sidebar (/dashboard, /cursos, etc.) */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/personal" element={<PersonalPage />} />
        <Route path="/estudiantes" element={<EstudiantesPage />} />
        <Route path="/cursos" element={<CursosPage />} />
        <Route path="/asistencia" element={<AsistenciaPage />} />
        <Route path="/comunicados" element={<ComunicadosPage />} />
        <Route path="/padres" element={<PadresPage />} />
        <Route path="/pagos" element={<PagosPage />} />
        <Route path="/proveedores" element={<ProveedoresPage />} />
        <Route path="/configuracion" element={<ConfiguracionPage />} />
        <Route path="/establecimientos" element={<EstablecimientosPage />} />
      </Route>

      {/* Cualquier ruta desconocida */}
      <Route path="*" element={<AuthRedirect />} />
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
