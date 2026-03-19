import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  GraduationCap, LayoutDashboard, Users, BookOpen,
  MessageSquare, Bell, CreditCard, Package,
  LogOut, ChevronRight, Settings, Building2, CheckSquare
} from 'lucide-react'

const navItems = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard',          end: true },
  { to: '/personal',    icon: Users,           label: 'Personal' },
  { to: '/estudiantes', icon: GraduationCap,   label: 'Estudiantes' },
  { to: '/cursos',      icon: BookOpen,        label: 'Cursos' },
  { to: '/asistencia',  icon: CheckSquare,     label: 'Asistencia' },
  { to: '/comunicados', icon: MessageSquare,   label: 'Comunicación Interna' },
  { to: '/padres',      icon: Bell,            label: 'Gestión de Apoderados' },
  { to: '/pagos',       icon: CreditCard,      label: 'Pagos Apoderados' },
  { to: '/proveedores', icon: Package,         label: 'Pagos Proveedores' },
]

const adminItems = [
  { to: '/establecimientos', icon: Building2, label: 'Establecimientos' },
]

const rolLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  direccion: 'Dirección',
  profesor: 'Profesor/a',
  administrativo: 'Administrativo/a',
  apoderado: 'Apoderado/a',
}

interface SidebarProps { collapsed: boolean; onToggle: () => void }

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { perfil, user, signOut } = useAuth()
  const navigate = useNavigate()

  console.log('🔴 Current Auth User ID:', user?.id)
  console.log('🔴 Current Profile in State:', perfil)
  console.log('🔴 Current Role in State:', perfil?.rol)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

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
        {navItems
          .filter(item => {
            if (perfil?.rol === 'profesor') {
              return ['/', '/cursos', '/asistencia', '/comunicados', '/configuracion'].includes(item.to)
            }
            if (perfil?.rol === 'administrativo') {
              // Si agregas mas roles en el futuro, puedes filtrar aqui. 
              // Por ahora dejamos que direccion y super_admin vean todo.
              return ['/', '/estudiantes', '/cursos', '/asistencia', '/comunicados', '/padres', '/pagos'].includes(item.to)
            }
            return true
          })
          .map(({ to, icon: Icon, label, end }) => (
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
            {!collapsed && <p className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administración</p>}
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
      </nav>

      {/* Bottom: user + settings */}
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
            <p className="text-sm font-medium text-slate-800 truncate">
              {perfil.nombre} {perfil.apellido}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {rolLabels[perfil.rol] ?? perfil.rol}
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
