import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'
import LandingPage       from '@/pages/LandingPage'
import LoginPage         from '@/pages/LoginPage'
import DashboardPage     from '@/pages/DashboardPage'
import PersonalPage      from '@/pages/PersonalPage'
import EstudiantesPage   from '@/pages/EstudiantesPage'
import CursosPage        from '@/pages/CursosPage'
import ComunicadosPage   from '@/pages/ComunicadosPage'
import PadresPage        from '@/pages/PadresPage'
import PagosPage         from '@/pages/PagosPage'
import ProveedoresPage   from '@/pages/ProveedoresPage'
import ConfiguracionPage from '@/pages/ConfiguracionPage'
import { Spinner } from '@/components/ui'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="w-8 h-8 text-brand-500" />
        <p className="text-sm text-slate-400">Cargando Bloom Education...</p>
      </div>
    </div>
  )
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? <>{children}</> : <Navigate to="/app" replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing pública */}
      <Route path="/" element={<LandingPage />} />

      {/* Login público */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* App privada bajo /app */}
      <Route path="/app" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index                element={<DashboardPage />} />
        <Route path="personal"      element={<PersonalPage />} />
        <Route path="estudiantes"   element={<EstudiantesPage />} />
        <Route path="cursos"        element={<CursosPage />} />
        <Route path="comunicados"   element={<ComunicadosPage />} />
        <Route path="padres"        element={<PadresPage />} />
        <Route path="pagos"         element={<PagosPage />} />
        <Route path="proveedores"   element={<ProveedoresPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />
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
