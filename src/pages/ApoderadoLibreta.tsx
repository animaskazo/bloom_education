import { useEffect, useState } from 'react'
import { supabase, Estudiante, LibretaConfig, LibretaDiaria, EstudianteApoderado, Curso } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner, EmptyState, PageHeader } from '@/components/ui'
import { 
  Baby, 
  Calendar, 
  ChevronRight, 
  MessageSquare, 
  Heart, 
  Activity, 
  Coffee, 
  Moon,
  ChevronLeft,
  User
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ApoderadoLibreta() {
  const { perfil, selectedEstablecimientoId, setSelectedEstablecimientoId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [hijos, setHijos] = useState<(Estudiante & { curso?: Curso })[]>([])
  const [selectedHijo, setSelectedHijo] = useState<(Estudiante & { curso?: Curso }) | null>(null)
  const [configs, setConfigs] = useState<LibretaConfig[]>([])
  const [logs, setLogs] = useState<LibretaDiaria[]>([])
  
  useEffect(() => {
    if (perfil) {
      loadData()
    }
  }, [perfil])

  async function loadData() {
    setLoading(true)
    
    // 1. Obtener el registro de apoderado para este perfil
    const { data: apodData } = await supabase
      .from('apoderados')
      .select('id, establecimiento_id')
      .eq('perfil_id', perfil?.id)
      .maybeSingle()

    if (!apodData) {
      setLoading(false)
      return
    }

    // Setear el establecimiento global si estaba faltando
    const targetEstId = selectedEstablecimientoId || apodData.establecimiento_id
    if (!selectedEstablecimientoId && apodData.establecimiento_id) {
      setSelectedEstablecimientoId(apodData.establecimiento_id)
    }

    // 2. Obtener hijos vinculados usando la tabla correcta 'estudiante_apoderado'
    const { data: links } = await supabase
      .from('estudiante_apoderado')
      .select('estudiante_id')
      .eq('apoderado_id', apodData.id)

    if (links && links.length > 0) {
      const ids = links.map(l => l.estudiante_id)
      const { data: estData } = await supabase
        .from('estudiantes')
        .select('*, cursos(*)')
        .in('id', ids)
      
      const formatted = (estData || []).map(e => ({ ...e, curso: e.cursos }))
      setHijos(formatted)
      if (formatted.length > 0) {
        setSelectedHijo(formatted[0])
        loadStudentLogs(formatted[0].id)
      }
    }

    // 3. Obtener configuraciones de libreta para el establecimiento
    const { data: confData } = await supabase
      .from('libreta_configuracion')
      .select('*')
      .eq('establecimiento_id', targetEstId)
      .eq('estado', 'activo')
      .order('orden')
    
    setConfigs(confData || [])
    setLoading(false)
  }

  async function loadStudentLogs(estId: string) {
    const { data } = await supabase
      .from('libreta_diaria')
      .select('*')
      .eq('estudiante_id', estId)
      .order('fecha', { ascending: false })
      .limit(15) // Mostrar los últimos 15 días
    
    setLogs(data || [])
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner className="w-8 h-8 text-brand-500" /></div>

  if (hijos.length === 0) {
    return (
      <div className="p-6 h-screen flex flex-col items-center justify-center space-y-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
          <Baby className="w-10 h-10" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-800">No hay alumnos vinculados</h2>
          <p className="text-sm text-slate-500">Contacta a la administración de tu jardín para vincular tu cuenta con tu hijo/a.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-fade-in">
      {/* Header Fijo */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-100">
             <Heart className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Libreta Diaria</h1>
            <p className="text-[10px] uppercase font-bold text-brand-500 tracking-widest">Portal Apoderados</p>
          </div>
        </div>
      </div>

      {/* Selector de Hijos si hay más de uno */}
      {hijos.length > 1 && (
        <div className="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar bg-white mb-2 shadow-sm">
          {hijos.map(h => (
            <button 
              key={h.id}
              onClick={() => { setSelectedHijo(h); loadStudentLogs(h.id); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl whitespace-nowrap transition-all border-2 ${selectedHijo?.id === h.id ? 'bg-brand-500 border-brand-600 text-white' : 'bg-white border-slate-100 text-slate-500 shadow-sm'}`}
            >
              <User className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{h.nombre}</span>
            </button>
          ))}
        </div>
      )}

      {/* Perfil del Alumno */}
      {selectedHijo && (
        <div className="p-6">
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-3xl p-6 text-white shadow-xl shadow-brand-100 mb-8 relative overflow-hidden">
             <div className="absolute right-[-20px] top-[-20px] opacity-10">
                <Baby className="w-32 h-32" />
             </div>
             <div className="relative z-10">
               <h2 className="text-2xl font-bold">{selectedHijo.nombre}</h2>
               <p className="text-brand-100 text-sm font-medium">{selectedHijo.curso?.nombre} {selectedHijo.curso?.letra}</p>
             </div>
          </div>

          <h3 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-1">
             <Calendar className="w-3.5 h-3.5" /> Actividad Reciente
          </h3>

          <div className="space-y-6">
            {logs.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-slate-200">
                <p className="text-slate-400 text-sm italic font-medium">Aún no hay registros de actividad para {selectedHijo.nombre}.</p>
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:border-brand-200 transition-all border-l-4 border-l-brand-500">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{format(new Date(log.fecha + 'T12:00:00'), "EEEE", { locale: es })}</span>
                       <span className="text-lg font-bold text-slate-800">{format(new Date(log.fecha + 'T12:00:00'), "d 'de' MMMM", { locale: es })}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {configs.map(q => {
                      const res = log.respuestas[q.id]
                      if (!res) return null
                      return (
                        <div key={q.id} className="bg-slate-50 rounded-2xl p-3 flex flex-col gap-1 border border-slate-100">
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{q.pregunta}</span>
                           <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-800">{res.r}</span>
                           </div>
                           {res.c && <span className="text-[10px] text-brand-600 italic bg-white px-2 py-0.5 rounded-lg border border-brand-50 mt-1">{res.c}</span>}
                        </div>
                      )
                    })}
                  </div>

                  {log.comentario_general && (
                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 relative pt-8">
                       <div className="absolute top-0 left-4 -translate-y-1/2 bg-emerald-500 px-3 py-1 rounded-full text-white text-[9px] font-bold uppercase tracking-widest shadow-md">
                          Nota de la Tía/Profe
                       </div>
                       <MessageSquare className="w-5 h-5 text-emerald-400 absolute top-2 right-4 opacity-50" />
                       <p className="text-sm text-emerald-900 leading-relaxed italic">"{log.comentario_general}"</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom Padding for Navbar Fix */}
      <div className="h-10" />
    </div>
  )
}
