import { useEffect, useState } from 'react'
import { supabase, Curso, Estudiante, LibretaConfig, LibretaDiaria } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Spinner, EmptyState, Modal, ConfirmDialog } from '@/components/ui'
import { 
  Book, Settings, Plus, Trash2, Save, ChevronRight, 
  ChevronLeft, Calendar, User, MessageSquare, 
  CheckCircle2, AlertCircle, Info, ChevronDown
} from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

export default function LibretaPage() {
  const { perfil, selectedEstablecimientoId } = useAuth()
  const canConfig = perfil?.rol === 'super_admin' || perfil?.rol === 'direccion'
  
  const [activeTab, setActiveTab] = useState<'registro' | 'config'>('registro')
  const [loading, setLoading] = useState(true)
  const [cursos, setCursos] = useState<Curso[]>([])
  const [cursoId, setCursoId] = useState<string>('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [config, setConfig] = useState<LibretaConfig[]>([])
  const [registros, setRegistros] = useState<Record<string, LibretaDiaria>>({})
  
  const [editingStudent, setEditingStudent] = useState<Estudiante | null>(null)
  const [formResponses, setFormResponses] = useState<Record<string, { r: string; c?: string }>>({})
  const [generalComment, setGeneralComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

  // Config State
  const [isModalConfigOpen, setIsModalConfigOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<Partial<LibretaConfig> | null>(null)
  const [delConfigId, setDelConfigId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (!selectedEstablecimientoId) return
      setLoading(true)
      
      const [{ data: curData }, { data: confData }] = await Promise.all([
        supabase.from('cursos').select('*').eq('estado', 'activo').eq('establecimiento_id', selectedEstablecimientoId).order('nombre'),
        supabase.from('libreta_configuracion').select('*').eq('establecimiento_id', selectedEstablecimientoId).eq('estado', 'activo').order('orden')
      ])
      
      setCursos(curData ?? [])
      if (curData && curData.length > 0) setCursoId(curData[0].id)
      
      setConfig(confData ?? [])
      setLoading(false)
    }
    init()
  }, [selectedEstablecimientoId])

  useEffect(() => {
    if (cursoId && fecha && activeTab === 'registro') loadDailyData()
  }, [cursoId, fecha, activeTab])

  async function loadDailyData() {
    setLoading(true)
    const { data: ests } = await supabase.from('estudiantes').select('*').eq('curso_id', cursoId).eq('estado', 'activo').order('apellido')
    setEstudiantes(ests ?? [])

    const { data: regs } = await supabase.from('libreta_diaria').select('*').eq('establecimiento_id', selectedEstablecimientoId).eq('fecha', fecha)
    
    const map: Record<string, LibretaDiaria> = {}
    regs?.forEach(r => map[r.estudiante_id] = r)
    setRegistros(map)
    setLoading(false)
  }

  const changeDay = (dir: number) => {
    const d = new Date(fecha + 'T12:00:00')
    setFecha(format(dir > 0 ? addDays(d, 1) : subDays(d, 1), 'yyyy-MM-dd'))
  }

  // --- REGISTRO ACTIONS ---
  const openEntry = (est: Estudiante) => {
    const existing = registros[est.id]
    setEditingStudent(est)
    setFormResponses(existing?.respuestas || {})
    setGeneralComment(existing?.comentario_general || '')
  }

  async function saveEntry() {
    if (!editingStudent || !selectedEstablecimientoId || !perfil) return
    setSaving(true)
    
    const payload = {
      estudiante_id: editingStudent.id,
      fecha: fecha,
      registrado_por: perfil.id,
      respuestas: formResponses,
      comentario_general: generalComment,
      establecimiento_id: selectedEstablecimientoId
    }

    const { error } = await supabase.from('libreta_diaria').upsert(payload, { onConflict: 'estudiante_id,fecha' })

    if (error) {
      setMessage({ text: 'Error: ' + error.message, type: 'error' })
    } else {
      setMessage({ text: 'Actividad guardada', type: 'success' })
      loadDailyData()
      setEditingStudent(null)
    }
    setSaving(false)
    setTimeout(() => setMessage(null), 3000)
  }

  // --- CONFIG ACTIONS ---
  async function saveConfig() {
    if (!editingConfig || !selectedEstablecimientoId) return
    
    const payload = {
      ...editingConfig,
      establecimiento_id: selectedEstablecimientoId,
      opciones: typeof editingConfig.opciones === 'string' ? (editingConfig.opciones as string).split(',').map(s => s.trim()) : editingConfig.opciones
    }

    const { error } = editingConfig.id 
      ? await supabase.from('libreta_configuracion').update(payload).eq('id', editingConfig.id)
      : await supabase.from('libreta_configuracion').insert([payload])

    if (!error) {
      setIsModalConfigOpen(false)
      const { data } = await supabase.from('libreta_configuracion').select('*').eq('establecimiento_id', selectedEstablecimientoId).eq('estado', 'activo').order('orden')
      setConfig(data ?? [])
    }
  }

  async function deleteConfig() {
    if (!delConfigId) return
    await supabase.from('libreta_configuracion').update({ estado: 'inactivo' }).eq('id', delConfigId)
    setDelConfigId(null)
    const { data } = await supabase.from('libreta_configuracion').select('*').eq('establecimiento_id', selectedEstablecimientoId).eq('estado', 'activo').order('orden')
    setConfig(data ?? [])
  }

  return (
    <div className="space-y-5 animate-fade-in pb-20">
      <PageHeader
        title="Libreta de Comunicaciones"
        subtitle="Registro de actividad diaria del alumno"
        action={
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button 
              onClick={() => setActiveTab('registro')} 
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'registro' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
             >
               <Book className="w-3.5 h-3.5"/> Registro
             </button>
             {canConfig && (
               <button 
                onClick={() => setActiveTab('config')} 
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'config' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Settings className="w-3.5 h-3.5"/> Configuración
               </button>
             )}
          </div>
        }
      />

      {activeTab === 'registro' ? (
        <div className="space-y-5">
          {/* Filters for Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4 flex flex-col sm:flex-row gap-4 items-center">
              <div className="form-group flex-1 w-full">
                <label className="label">Curso</label>
                <select className="input" value={cursoId} onChange={e => setCursoId(e.target.value)}>
                  {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.letra}</option>)}
                </select>
              </div>
              <div className="flex bg-slate-50 p-1 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
                <button onClick={() => changeDay(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft className="w-5 h-5 text-slate-500"/></button>
                <div className="flex items-center gap-2 px-4 font-bold text-sm text-slate-700">
                  <Calendar className="w-4 h-4 text-brand-500"/>
                  {format(new Date(fecha + 'T12:00:00'), "eee d 'de' MMM", { locale: es })}
                </div>
                <button onClick={() => changeDay(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight className="w-5 h-5 text-slate-500"/></button>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-4 bg-brand-50 border-brand-100">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-brand-900 uppercase tracking-wider">Resumen</p>
                <p className="text-sm text-brand-700">
                  {Object.keys(registros).length} de {estudiantes.length} alumnos registrados hoy.
                </p>
              </div>
            </div>
          </div>

          {/* Student Grid (Mobile Oriented) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full flex justify-center py-12"><Spinner className="w-8 h-8 text-brand-500" /></div>
            ) : estudiantes.length === 0 ? (
              <div className="col-span-full"><EmptyState title="Sin alumnos" description="No hay alumnos en este curso." /></div>
            ) : (
              estudiantes.map(e => {
                const hasInfo = !!registros[e.id]
                return (
                  <div 
                    key={e.id} 
                    onClick={() => openEntry(e)}
                    className={`card p-4 flex items-center gap-4 cursor-pointer transition-all active:scale-95 border-b-4 ${hasInfo ? 'border-b-emerald-500 bg-emerald-50/30' : 'border-b-slate-200 hover:border-b-brand-400'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${hasInfo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {e.nombre[0]}{e.apellido[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{e.nombre} {e.apellido}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">{e.rut}</p>
                    </div>
                    {hasInfo ? (
                      <div className="bg-emerald-500 p-1.5 rounded-full text-white shadow-lg shadow-emerald-200 animate-bounce-subtle">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        /* CONFIGURATION VIEW */
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-slate-800">Preguntas de la Libreta</h3>
            <button 
              className="btn-primary btn-sm" 
              onClick={() => { setEditingConfig({ pregunta: '', opciones: ['Si', 'No'], permite_comentario: true, orden: config.length, estado: 'activo' }); setIsModalConfigOpen(true); }}
            >
              <Plus className="w-4 h-4" /> Nueva Pregunta
            </button>
          </div>
          
          <div className="space-y-3">
            {config.length === 0 ? (
              <EmptyState title="Sin preguntas" description="Configura las preguntas que los profesores responderán diariamente." />
            ) : (
              config.map(c => (
                <div key={c.id} className="card p-4 flex items-center justify-between group transition-all hover:border-brand-300 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400 border border-slate-100">
                      {c.orden + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{c.pregunta}</h4>
                      <div className="flex gap-1 mt-1">
                        {c.opciones.map(o => (
                          <span key={o} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">{o}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost btn-sm p-2 text-slate-400 hover:text-brand-600" onClick={() => { setEditingConfig(c); setIsModalConfigOpen(true); }}>
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="btn-ghost btn-sm p-2 text-slate-400 hover:text-red-600" onClick={() => setDelConfigId(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FORM MODAL (MOBILE FRIENDLY) */}
      <Modal 
        open={!!editingStudent} 
        onClose={() => setEditingStudent(null)} 
        title={`Libreta: ${editingStudent?.nombre}`}
        size="lg"
      >
        <div className="px-6 py-4 space-y-6">
          {config.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No hay preguntas configuradas. Ve a la pestaña de Configuración.
            </div>
          ) : (
            config.map(q => (
              <div key={q.id} className="space-y-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-brand-500 rounded-full" />
                  {q.pregunta}
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {q.opciones.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setFormResponses(prev => ({ ...prev, [q.id]: { ...prev[q.id], r: opt } }))}
                      className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all border-2 ${formResponses[q.id]?.r === opt ? 'bg-brand-500 border-brand-600 text-white shadow-lg shadow-brand-100' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {q.permite_comentario && (
                  <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-3 border border-slate-100 focus-within:border-brand-300 transition-all">
                    <MessageSquare className="w-4 h-4 text-slate-300" />
                    <input 
                      className="w-full py-2.5 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300"
                      placeholder="Comentario opcional..."
                      value={formResponses[q.id]?.c || ''}
                      onChange={e => setFormResponses(prev => ({ ...prev, [q.id]: { ...prev[q.id], c: e.target.value } }))}
                    />
                  </div>
                )}
              </div>
            ))
          )}

          <div className="div-divider" />
          
          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Comentario General</label>
             <textarea 
               className="input min-h-[100px] rounded-2xl" 
               placeholder="Escribe alguna observación o detalle general del día..."
               value={generalComment}
               onChange={e => setGeneralComment(e.target.value)}
             />
          </div>
        </div>

        <div className="p-6 flex justify-end gap-3 border-t border-slate-100 mt-2">
           <button className="btn-secondary" onClick={() => setEditingStudent(null)}>Cerrar</button>
           <button className="btn-primary px-8" onClick={saveEntry} disabled={saving}>
             <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
           </button>
        </div>
      </Modal>

      {/* CONFIG MODAL */}
      <Modal open={isModalConfigOpen} onClose={() => setIsModalConfigOpen(false)} title={editingConfig?.id ? 'Editar Pregunta' : 'Nueva Pregunta'}>
        <div className="p-6 space-y-4">
          <div className="form-group">
            <label className="label">Pregunta</label>
            <input 
              className="input" 
              value={editingConfig?.pregunta || ''} 
              onChange={e => setEditingConfig({ ...editingConfig, pregunta: e.target.value })} 
              placeholder="Ej: ¿Durmió siesta?"
            />
          </div>
          <div className="form-group">
            <label className="label">Opciones (separadas por coma)</label>
            <input 
              className="input" 
              value={Array.isArray(editingConfig?.opciones) ? (editingConfig?.opciones as string[]).join(', ') : editingConfig?.opciones || ''} 
              onChange={e => setEditingConfig({ ...editingConfig, opciones: e.target.value as any })} 
              placeholder="Ej: Si, No, Un poco"
            />
          </div>
          <div className="flex items-center gap-3 py-2">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded text-brand-500 focus:ring-brand-400" 
              checked={editingConfig?.permite_comentario || false} 
              onChange={e => setEditingConfig({ ...editingConfig, permite_comentario: e.target.checked })} 
            />
            <label className="text-sm font-medium text-slate-700">Permitir comentarios por ítem</label>
          </div>
          <div className="form-group">
            <label className="label">Orden</label>
            <input 
              type="number" 
              className="input" 
              value={editingConfig?.orden || 0} 
              onChange={e => setEditingConfig({ ...editingConfig, orden: parseInt(e.target.value) })} 
            />
          </div>
        </div>
        <div className="p-6 flex justify-end gap-2 border-t border-slate-100">
          <button className="btn-secondary" onClick={() => setIsModalConfigOpen(false)}>Cancelar</button>
          <button className="btn-primary" onClick={saveConfig}>Guardar</button>
        </div>
      </Modal>

      <ConfirmDialog 
        open={!!delConfigId} 
        onClose={() => setDelConfigId(null)} 
        onConfirm={deleteConfig} 
        title="Eliminar Pregunta" 
        message="¿Estás seguro de desactivar esta pregunta? Ya no aparecerá en los registros diarios." 
      />

      {message && (
        <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-fade-in border-l-4 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500"/> : <AlertCircle className="w-5 h-5 text-red-500"/>}
          <span className="text-sm font-bold">{message.text}</span>
        </div>
      )}
    </div>
  )
}
