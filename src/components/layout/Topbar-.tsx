import { Bell, Search } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from 'react-router-dom'

const pageNames: Record<string, string> = {
  '/':              'Dashboard',
  '/personal':      'Gestión de Personal',
  '/estudiantes':   'Gestión de Estudiantes',
  '/cursos':        'Gestión de Cursos',
  '/comunicados':   'Comunicación Interna',
  '/padres':        'Comunicación con Padres',
  '/pagos':         'Pagos y Cobranza Apoderados',
  '/proveedores':   'Pagos a Proveedores',
  '/configuracion': 'Configuración',
}

export default function Topbar() {
  const { perfil } = useAuth()
  const location = useLocation()
  const pageTitle = pageNames[location.pathname] ?? 'Bloom'
  const initials = perfil
    ? `${perfil.nombre[0]}${perfil.apellido[0]}`.toUpperCase()
    : 'U'

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0 shadow-nav">
      <h2 className="font-semibold text-slate-800 text-base">{pageTitle}</h2>

      <div className="ml-auto flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-1.5 bg-slate-100 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 w-52 transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center text-white text-xs font-bold cursor-pointer">
          {initials}
        </div>
      </div>
    </header>
  )
}
