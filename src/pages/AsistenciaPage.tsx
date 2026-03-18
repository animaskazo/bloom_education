import { useEffect, useState } from 'react'
import { supabase, Curso, Estudiante, Asistencia, EstadoAsistencia } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Spinner, EmptyState } from '@/components/ui'
import { Calendar, CheckCircle2, XCircle, Clock, AlertCircle, Save, ChevronRight, ChevronLeft } from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AsistenciaPage() {
  const { perfil } = useAuth()
  const [cursos, setCursos] = useState<Curso[]>([])
  const [cursoId, setCursoId] = useState<string>('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [asistencias, setAsistencias] = useState<Record<string, EstadoAsistencia>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function init() {
      if (!perfil?.establecimiento_id) return
      const { data } = await supabase.from('cursos').select('*').eq('estado', 'activo').order('nombre')
      if (data && data.length > 0) {
        setCursos(data)
        setCursoId(data[0].id)
      }
      setLoading(false)
    }
    init()
  }, [perfil])

  useEffect(() => {
    if (cursoId && fecha) loadDay()
  }, [cursoId, fecha])

  async function loadDay() {
    setLoading(true)
    // 1. Cargar estudiantes del curso
    const { data: ests } = await supabase.from('estudiantes').select('*').eq('curso_id', cursoId).eq('estado', 'activo').order('apellido')
    setEstudiantes(ests ?? [])

    // 2. Cargar asistencias existentes para este dia
    const { data: asis } = await supabase.from('asistencia').select('*').eq('curso_id', cursoId).eq('fecha', fecha)
    
    const map: Record<string, EstadoAsistencia> = {}
    ests?.forEach(e => map[e.id] = 'presente') // Default
    asis?.forEach(a => map[a.estudiante_id] = a.estado)
    setAsistencias(map)

    setLoading(false)
  }

  async function saveAll() {
    if (!perfil?.establecimiento_id) return
    setSaving(true)
    setMessage(null)

    const payload = estudiantes.map(e => ({
      estudiante_id: e.id,
      curso_id: cursoId,
      establecimiento_id: perfil.establecimiento_id,
      fecha: fecha,
      estado: asistencias[e.id] || 'presente'
    }))

    // Upsert: Borramos el dia anterior del curso y subimos lo nuevo
    const { error: delErr } = await supabase.from('asistencia').delete().eq('curso_id', cursoId).eq('fecha', fecha)
    
    if (delErr) {
        setMessage({ text: 'Error al limpiar datos previos: ' + delErr.message, type: 'error' })
        setSaving(false)
        return
    }

    const { error } = await supabase.from('asistencia').insert(payload)

    if (error) setMessage({ text: 'Error al guardar: ' + error.message, type: 'error' })
    else setMessage({ text: 'Asistencia guardada exitosamente', type: 'success' })
    
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  function changeState(estId: string, state: EstadoAsistencia) {
    setAsistencias(prev => ({ ...prev, [estId]: state }))
  }

  const changeDay = (dir: number) => {
    const d = new Date(fecha + 'T12:00:00')
    setFecha(format(dir > 0 ? addDays(d, 1) : subDays(d, 1), 'yyyy-MM-dd'))
  }

  const getStats = () => {
    const vals = Object.values(asistencias)
    return {
      presentes: vals.filter(v => v === 'presente').length,
      ausentes: vals.filter(v => v === 'ausente').length,
      atrasados: vals.filter(v => v === 'atrasado').length,
      justificados: vals.filter(v => v === 'justificado').length
    }
  }

  const stats = getStats()

  return (
    <div className="space-y-5 animate-fade-in pb-20">
      <PageHeader
        title="Pase de Asistencia"
        subtitle="Registro diario por curso"
        action={
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button onClick={() => changeDay(-1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-slate-500"/></button>
             <div className="flex items-center gap-2 px-3 font-medium text-sm text-slate-700">
               <Calendar className="w-3.5 h-3.5 text-slate-400"/>
               {format(new Date(fecha + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
             </div>
             <button onClick={() => changeDay(1)} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-slate-500"/></button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="card w-full md:w-64 p-4 space-y-4">
          <div className="form-group">
            <label className="label">Curso</label>
            <select className="input" value={cursoId} onChange={e => setCursoId(e.target.value)}>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.letra}</option>)}
            </select>
          </div>
          <div className="div-divider h-px bg-slate-100 w-full" />
          <div className="space-y-3">
             <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">RESUMEN DEL DÍA</p>
             <StatRow label="Presentes" val={stats.presentes} color="text-emerald-600" bg="bg-emerald-50" icon={CheckCircle2}/>
             <StatRow label="Ausentes" val={stats.ausentes} color="text-red-600" bg="bg-red-50" icon={XCircle}/>
             <StatRow label="Atrasados" val={stats.atrasados} color="text-amber-600" bg="bg-amber-50" icon={Clock}/>
          </div>
        </div>

        <div className="card flex-1 min-w-0 overflow-hidden">
          <div className="card-header items-center justify-between gap-3">
            <h3 className="section-title">Nómina de Alumnos</h3>
            {message && (
              <div className={`text-xs px-3 py-1 rounded-full font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {message.text}
              </div>
            )}
          </div>
          
          <div className="table-wrapper">
            {loading ? (
              <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-brand-500" /></div>
            ) : estudiantes.length === 0 ? (
              <EmptyState title="Sin estudiantes" description="No hay estudiantes matriculados en este curso." />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-10">N°</th>
                    <th>Nombre</th>
                    <th className="text-center">Estado de Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map((e, idx) => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="text-slate-400 font-medium">{idx + 1}</td>
                      <td>
                        <div className="font-semibold text-slate-800">{e.nombre} {e.apellido}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{e.rut}</div>
                      </td>
                      <td className="py-2">
                        <div className="flex justify-center gap-1">
                          <ToggleButton 
                            active={asistencias[e.id] === 'presente'} 
                            onClick={() => changeState(e.id, 'presente')} 
                            icon={CheckCircle2} label="Presente" 
                            color="active:bg-emerald-500 active-text:text-white"
                          />
                          <ToggleButton 
                            active={asistencias[e.id] === 'ausente'} 
                            onClick={() => changeState(e.id, 'ausente')} 
                            icon={XCircle} label="Ausente" 
                            color="active:bg-red-500 active-text:text-white"
                          />
                          <ToggleButton 
                            active={asistencias[e.id] === 'atrasado'} 
                            onClick={() => changeState(e.id, 'atrasado')} 
                            icon={Clock} label="Atrasado" 
                            color="active:bg-amber-500 active-text:text-white"
                          />
                          <ToggleButton 
                            active={asistencias[e.id] === 'justificado'} 
                            onClick={() => changeState(e.id, 'justificado')} 
                            icon={AlertCircle} label="Justificada" 
                            color="active:bg-blue-500 active-text:text-white"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 pointer-events-none">
          <div className="pointer-events-auto shadow-2xl rounded-2xl p-4 bg-white border border-slate-100 flex items-center gap-4">
              <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Confirmación Final</span>
                  <span className="text-sm font-medium text-slate-700">{estudiantes.length} alumnos procesados</span>
              </div>
              <button 
                onClick={saveAll} 
                disabled={saving || loading}
                className={`btn-primary px-6 py-2.5 shadow-lg shadow-brand-200 transition-all ${saving ? 'opacity-70 scale-95' : 'hover:scale-105 active:scale-95'}`}
              >
                <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`}/>
                {saving ? 'Guardando...' : 'Finalizar Día'}
              </button>
          </div>
      </div>
    </div>
  )
}

function StatRow({ label, val, color, bg, icon: Icon }: any) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg ${bg}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${color}`}/>
        <span className={`text-xs font-medium ${color}`}>{label}</span>
      </div>
      <span className={`text-sm font-bold ${color}`}>{val}</span>
    </div>
  )
}

function ToggleButton({ active, onClick, icon: Icon, label, color }: any) {
  const [style, setStyle] = useState("")
  
  useEffect(() => {
    if (active) {
        if (label === "Presente") setStyle("bg-emerald-500 text-white shadow-md border-emerald-600")
        else if (label === "Ausente") setStyle("bg-red-500 text-white shadow-md border-red-600")
        else if (label === "Atrasado") setStyle("bg-amber-500 text-white shadow-md border-amber-600")
        else if (label === "Justificada") setStyle("bg-blue-500 text-white shadow-md border-blue-600")
    } else {
        setStyle("bg-white text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-600")
    }
  }, [active])

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 ${style}`}
    >
      <Icon className="w-3.5 h-3.5"/>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
