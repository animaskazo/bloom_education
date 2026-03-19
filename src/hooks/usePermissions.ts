import { useAuth } from '@/hooks/useAuth'
import { UserRole } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// MATRIZ DE PERMISOS POR ROL
// Agrega o quita rutas aquí para controlar el acceso de cada rol.
// ─────────────────────────────────────────────────────────────────────────────

export type AppRoute =
  | 'dashboard'
  | 'personal'
  | 'estudiantes'
  | 'cursos'
  | 'comunicados'
  | 'padres'
  | 'pagos'
  | 'proveedores'
  | 'configuracion'

type PermissionMatrix = Record<UserRole | 'super_admin', AppRoute[]>

const PERMISSIONS: PermissionMatrix = {
  // Dirección: acceso total
  direccion: [
    'dashboard', 'personal', 'estudiantes', 'cursos',
    'comunicados', 'padres', 'pagos', 'proveedores', 'configuracion',
  ],

  // Profesor: ve sus cursos, estudiantes, comunica con padres e internamente
  profesor: [
    'dashboard', 'estudiantes', 'cursos', 'comunicados', 'padres', 'configuracion',
  ],

  // Administrativo: gestión operativa sin módulos académicos
  administrativo: [
    'dashboard', 'personal', 'estudiantes',
    'comunicados', 'padres', 'pagos', 'proveedores', 'configuracion',
  ],

  // Apoderado: solo comunicaciones y sus pagos
  apoderado: [
    'dashboard', 'padres', 'pagos', 'configuracion',
  ],

  // Super admin: todo
  super_admin: [
    'dashboard', 'personal', 'estudiantes', 'cursos',
    'comunicados', 'padres', 'pagos', 'proveedores', 'configuracion',
  ],
}

// ─────────────────────────────────────────────────────────────────────────────

export function usePermissions() {
  const { perfil } = useAuth()

  const rol = (perfil?.rol ?? null) as (UserRole | 'super_admin' | null)

  /** Rutas a las que tiene acceso el usuario actual */
  const allowedRoutes: AppRoute[] = rol ? (PERMISSIONS[rol] ?? []) : []

  /** Comprueba si el usuario puede acceder a una ruta específica */
  function can(route: AppRoute): boolean {
    return allowedRoutes.includes(route)
  }

  /** Ruta inicial tras el login (primera ruta permitida del usuario) */
  const homeRoute = allowedRoutes.length > 0 ? `/app/${allowedRoutes[0] === 'dashboard' ? '' : allowedRoutes[0]}` : '/app'

  return { rol, allowedRoutes, can, homeRoute }
}
