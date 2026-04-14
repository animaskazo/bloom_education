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
import LibretaPage from '@/pages/LibretaPage'
import EstablecimientosPage from '@/pages/EstablecimientosPage'
import CalendarioPage from '@/pages/CalendarioPage'
import RegistroMovilPage from '@/pages/mobile/RegistroMovilPage'
import ApoderadoDashboard from '@/pages/mobile/ApoderadoDashboard'
import PrivacidadPage from '@/pages/PrivacidadPage'
import TerminosPage from '@/pages/TerminosPage'
import SoportePage from '@/pages/SoportePage'
import ContactoPage from '@/pages/ContactoPage'

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

function getInitialRoute(rol?: string) {
  if (rol === 'apoderado') return '/apoderado'
  if (rol === 'profesor') return '/registro-movil'
  return '/dashboard'
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, perfilLoading } = useAuth()
  if (loading || perfilLoading) return <LoadingScreen />
  
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, perfil, loading, perfilLoading } = useAuth()
  if (loading || perfilLoading) return <LoadingScreen />
  return !user ? <>{children}</> : <Navigate to={getInitialRoute(perfil?.rol)} replace />
}

function AuthRedirect() {
  const { user, perfil, loading, perfilLoading } = useAuth()
  if (loading || perfilLoading) return <LoadingScreen />
  return <Navigate to={user ? getInitialRoute(perfil?.rol) : '/login'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Pública */}
       <Route path="/" element={<LandingPage />} />
       <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
       
       {/* Páginas Legales y Soporte */}
       <Route path="/privacidad" element={<PrivacidadPage />} />
       <Route path="/terminos" element={<TerminosPage />} />
       <Route path="/soporte" element={<SoportePage />} />
       <Route path="/contacto" element={<ContactoPage />} />

      {/* Privadas — AppLayout wrapper gestiona la distinción visual de layout */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/personal" element={<PersonalPage />} />
        <Route path="/estudiantes" element={<EstudiantesPage />} />
        <Route path="/cursos" element={<CursosPage />} />
        <Route path="/asistencia" element={<AsistenciaPage />} />
        <Route path="/libreta" element={<LibretaPage />} />
        <Route path="/libreta-apoderado" element={<Navigate to="/apoderado" replace />} />
        <Route path="/apoderado" element={<ApoderadoDashboard />} />
        <Route path="/registro-movil" element={<RegistroMovilPage />} />
        <Route path="/comunicados" element={<ComunicadosPage />} />
        <Route path="/padres" element={<PadresPage />} />
        <Route path="/pagos" element={<PagosPage />} />
        <Route path="/proveedores" element={<ProveedoresPage />} />
        <Route path="/configuracion" element={<ConfiguracionPage />} />
        <Route path="/establecimientos" element={<EstablecimientosPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
      </Route>

      {/* Cualquier ruta desconocida */}
      <Route path="*" element={<AuthRedirect />} />
    </Routes>
  )
}

import { MensajeriaProvider } from '@/contexts/MensajeriaContext'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MensajeriaProvider>
          <AppRoutes />
        </MensajeriaProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
