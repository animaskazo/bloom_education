import { useEffect, useState } from 'react'
import { Bell, Search, Building2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from 'react-router-dom'
import { supabase, Establecimiento } from '@/lib/supabase'

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/personal': 'Gestión de Personal',
  '/estudiantes': 'Gestión de Estudiantes',
  '/cursos': 'Gestión de Cursos',
  '/asistencia': 'Asistencia',
  '/comunicados': 'Comunicación Interna',
  '/padres': 'Gestión de Apoderados',
  '/pagos': 'Pagos Apoderados',
  '/proveedores': 'Pagos Proveedores',
  '/configuracion': 'Configuración',
  '/establecimientos': 'Establecimientos'
}

import { useMensajeriaGlobal } from '@/contexts/MensajeriaContext'
import { Loader2 } from 'lucide-react'

export default function Topbar() {
  const { perfil, selectedEstablecimientoId, setSelectedEstablecimientoId } = useAuth()
  const { isSending, progress } = useMensajeriaGlobal()
  const location = useLocation()
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([])
  
  const pageTitle = pageNames[location.pathname] ?? 'EduTrack'
  const initials = perfil
    ? `${perfil.nombre[0]}${perfil.apellido[0]}`.toUpperCase()
    : 'U'

  useEffect(() => {
    if (perfil?.rol === 'super_admin') {
      supabase.from('establecimientos').select('*').eq('estado', 'activo').order('nombre')
        .then(({ data }) => setEstablecimientos(data ?? []))
    }
  }, [perfil])

  return (
    <header className="relative h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0 shadow-sm z-20">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-slate-800 text-base">Hola {perfil?.nombre}</h2>
        
        {perfil?.rol === 'super_admin' && establecimientos.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl ml-2 animate-fade-in shadow-inner">
            <Building2 className="w-3.5 h-3.5 text-brand-500" />
            <select 
              value={selectedEstablecimientoId || ''} 
              onChange={(e) => setSelectedEstablecimientoId(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-600 focus:outline-none focus:ring-0 cursor-pointer pr-8"
            >
              <option value="">Seleccionar Colegio</option>
              {establecimientos.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Progress indicator */}
        {isSending && progress.total > 0 && (
          <div className="hidden md:flex items-center gap-3 mr-4 px-3 py-1 bg-brand-50 border border-brand-100 rounded-lg animate-fade-in">
            <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-brand-600 uppercase tracking-tight">Enviando WhatsApp</span>
              <span className="text-[10px] text-slate-500 font-medium">{progress.current} de {progress.total}</span>
            </div>
          </div>
        )}

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

      {/* Thin Progress Bar at the bottom of header */}
      {isSending && progress.total > 0 && (
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-100 overflow-hidden">
          <div 
            className="h-full bg-brand-500 transition-all duration-300 ease-out"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
        </div>
      )}
    </header>
  )
}
