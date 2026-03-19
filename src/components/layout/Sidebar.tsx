import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  GraduationCap, LayoutDashboard, Users, BookOpen,
  MessageSquare, Bell, CreditCard, Package,
  LogOut, ChevronRight, Settings, Building2, CheckSquare
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/personal', icon: Users, label: 'Personal' },
  { to: '/estudiantes', icon: GraduationCap, label: 'Estudiantes' },
  { to: '/cursos', icon: BookOpen, label: 'Cursos' },
  { to: '/asistencia', icon: CheckSquare, label: 'Asistencia' },
  { to: '/comunicados', icon: MessageSquare, label: 'Comunicación Interna' },
  { to: '/padres', icon: Bell, label: 'Gestión de Apoderados' },
  { to: '/pagos', icon: CreditCard, label: 'Pagos Apoderados' },
  { to: '/proveedores', icon: Package, label: 'Pagos Proveedores' },
]

const adminItems = [
  { to: '/establecimientos', icon: Building2, label: 'Establecimientos' },
]

// ── Permisos por rol ────────────────────────────────────────────────────────
const ROL_RUTAS: Record<string, string[]> = {
  super_admin: ['/dashboard', '/personal', '/estudiantes', '/cursos', '/asistencia', '/comunicados', '/padres', '/pagos', '/proveedores'],
  direccion: ['/dashboard', '/personal', '/estudiantes', '/cursos', '/asistencia', '/comunicados', '/padres', '/pagos', '/proveedores'],
  profesor: ['/dashboard', '/cursos', '/asistencia', '/comunicados', '/padres'],
  administrativo: ['/dashboard', '/estudiantes', '/asistencia', '/comunicados', '/padres', '/pagos'],
  apoderado: ['/dashboard', '/padres', '/pagos'],
}

const ROL_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  direccion: 'Dirección',
  profesor: 'Profesor/a',
  administrativo: 'Administrativo/a',
  apoderado: 'Apoderado/a',
}

const ROL_COLORS: Record<string, string> = {
  super_admin: 'bg-red-50 text-red-700',
  direccion: 'bg-blue-50 text-blue-700',
  profesor: 'bg-green-50 text-green-700',
  administrativo: 'bg-purple-50 text-purple-700',
  apoderado: 'bg-amber-50 text-amber-700',
}

interface SidebarProps { collapsed: boolean; onToggle: () => void }

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { perfil, user, signOut, perfilLoading } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // Mientras el perfil no ha cargado, no filtramos — esperamos
  const rutasPermitidas = perfil ? (ROL_RUTAS[perfil.rol] ?? []) : null
  const itemsFiltrados = rutasPermitidas
    ? navItems.filter(item => rutasPermitidas.includes(item.to))
    : navItems // fallback: mostrar todo si perfil aún no llegó

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 fixed left-0 top-0 z-30`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-slide-in overflow-hidden">
            <p className="font-display font-semibold text-slate-900 leading-none">Bloom</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Gestión Educacional</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {perfilLoading ? (
          // Skeleton mientras carga el perfil
          <div className="space-y-1 px-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-9 bg-slate-100 rounded-xl animate-pulse"
                style={{ opacity: 1 - i * 0.15 }}
              />
            ))}
          </div>
        ) : (
          <>
            {itemsFiltrados.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
                }
                title={collapsed ? label : undefined}
              >
                <Icon className="icon" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}

            {perfil?.rol === 'super_admin' && (
              <div className={collapsed ? '' : 'mt-2'}>
                {!collapsed && (
                  <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Administración
                  </p>
                )}
                {adminItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
                    }
                    title={collapsed ? label : undefined}
                  >
                    <Icon className="icon" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                ))}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-slate-100 space-y-0.5">
        <NavLink
          to="/configuracion"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
          }
          title={collapsed ? 'Configuración' : undefined}
        >
          <Settings className="icon" />
          {!collapsed && <span>Configuración</span>}
        </NavLink>

        <button
          onClick={handleSignOut}
          className={`sidebar-link w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          <LogOut className="icon" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>

        {!collapsed && perfil && (
          <div className="mt-3 px-3 py-2.5 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROL_COLORS[perfil.rol] ?? 'bg-slate-100 text-slate-600'}`}>
                {ROL_LABELS[perfil.rol] ?? perfil.rol}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-800 truncate">
              {perfil.nombre} {perfil.apellido}
            </p>
            <p className="text-xs text-slate-400 truncate">{perfil.email}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
