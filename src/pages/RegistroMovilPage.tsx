import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Curso, Estudiante, LibretaConfig, LibretaDiaria } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner, EmptyState } from '@/components/ui'
import { 
  ChevronLeft, ChevronRight, Save, CheckCircle2, 
  ArrowLeft, MessageSquare, Coffee, BookOpen, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function RegistroMovilPage() {
  const { perfil, selectedEstablecimientoId } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [cursos, setCursos] = useState<Curso[]>([])
  const [selectedCursoId, setSelectedCursoId] = useState<string>('')
  
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [config, setConfig] = useState<LibretaConfig[]>([])
  const [registros, setRegistros] = useState<Record<string, LibretaDiaria>>({})
  
  const [mode, setMode] = useState<'selection' | 'registry' | 'done'>('selection')
  const [currentIndex, setCurrentIndex] = useState(0)

  // Form State para el alumno actual
  const [formResponses, setFormResponses] = useState<Record<string, { r: string; c?: string }>>({})
  const [generalComment, setGeneralComment] = useState('')

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function init() {
      if (!selectedEstablecimientoId) return
      setLoading(true)
      
      const [{ data: curData }, { data: confData }] = await Promise.all([
        supabase.from('cursos').select('*').eq('estado', 'activo').eq('establecimiento_id', selectedEstablecimientoId).order('nombre'),
        supabase.from('libreta_configuracion').select('*').eq('establecimiento_id', selectedEstablecimientoId).eq('estado', 'activo').order('orden')
      ])
      
      setCursos(curData ?? [])
      setConfig(confData ?? [])
      
      if (curData && curData.length > 0) {
        setSelectedCursoId(curData[0].id)
      }
      
      setLoading(false)
    }
    init()
  }, [selectedEstablecimientoId])

  // Carga lista de alumnos y registros del dia
  async function loadEstudiantes(cursoId: string) {
    if (!cursoId) return
    setLoading(true)
    const { data: ests } = await supabase.from('estudiantes').select('*').eq('curso_id', cursoId).eq('estado', 'activo').order('apellido')
    setEstudiantes(ests ?? [])

    const { data: regs } = await supabase.from('libreta_diaria').select('*').eq('establecimiento_id', selectedEstablecimientoId).eq('fecha', today)
    
    const map: Record<string, LibretaDiaria> = {}
    regs?.forEach(r => map[r.estudiante_id] = r)
    setRegistros(map)
    setLoading(false)
  }

  useEffect(() => {
    if (selectedCursoId && mode === 'selection') {
      loadEstudiantes(selectedCursoId)
    }
  }, [selectedCursoId, mode])

  function startRegistry() {
    if (estudiantes.length === 0) return
    setCurrentIndex(0)
    loadStudentDataIntoForm(0)
    setMode('registry')
  }

  function loadStudentDataIntoForm(index: number) {
    const est = estudiantes[index]
    if (!est) return
    const existing = registros[est.id]
    
    if (existing) {
      setFormResponses(existing.respuestas || {})
      setGeneralComment(existing.comentario_general || '')
    } else {
      // Auto-rellenar con predeterminados si es que lo deseamos más adelante
      setFormResponses({})
      setGeneralComment('')
    }
  }

  async function saveStudentAndProceed(nextIdx: number) {
    if (!selectedEstablecimientoId || !perfil) return
    const est = estudiantes[currentIndex]
    
    setSaving(true)
    const payload = {
      estudiante_id: est.id,
      fecha: today,
      registrado_por: perfil.id,
      respuestas: formResponses,
      comentario_general: generalComment,
      establecimiento_id: selectedEstablecimientoId
    }

    const { error } = await supabase.from('libreta_diaria').upsert(payload, { onConflict: 'estudiante_id,fecha' })
    if (error) {
      console.error(error)
      alert("Error al guardar. Revisa tu conexión.")
      setSaving(false)
      return
    }

    // Actualizamos el cache local del registro
    setRegistros(prev => ({ ...prev, [est.id]: payload as any }))
    
    if (nextIdx >= estudiantes.length) {
      setMode('done')
    } else {
      setCurrentIndex(nextIdx)
      loadStudentDataIntoForm(nextIdx)
    }
    setSaving(false)
  }

  function handleAutoFillPositive() {
    const positiveResponses: Record<string, { r: string; c?: string }> = {}
    config.forEach(q => {
      // Usualmente la primera o última es la positiva. Tomaremos la primera por simplicidad,
      // pero se recomienda un ajuste según las opciones del colegio
      if (q.opciones.length > 0) {
        positiveResponses[q.id] = { r: q.opciones[0] }
      }
    })
    setFormResponses(positiveResponses)
  }

  if (loading && mode === 'selection') {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><Spinner className="w-8 h-8 text-brand-500" /></div>
  }

  const currentEst = estudiantes[currentIndex]

  return (
    <div className="flex flex-col h-screen bg-slate-50 w-full animate-fade-in relative z-50">
      
      {/* HEADER MOVAL */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-20 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-3">
           {mode === 'registry' && (
             <button onClick={() => setMode('selection')} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-all">
               <ArrowLeft className="w-5 h-5" />
             </button>
           )}
           {mode === 'selection' && (
             <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-all">
               <ArrowLeft className="w-5 h-5" />
             </button>
           )}
           <div>
             <h1 className="text-lg font-bold text-slate-800 leading-tight">Libreta Móvil</h1>
             <p className="text-[11px] text-slate-400 font-medium">
                {format(new Date(today + 'T12:00:00'), "EEEE d 'de' MMMM", { locale: es })}
             </p>
           </div>
         </div>

         {/* Salida Rápida para profesores que quieren volver al escritorio */}
         {mode === 'selection' && (
           <button onClick={() => navigate('/libreta')} className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full">
             Modo PC
           </button>
         )}
      </div>

      {/* VISTA 1: SELECCION DE CURSO */}
      {mode === 'selection' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          <div className="card p-5 bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-brand-200 shadow-lg border-0">
             <h2 className="text-xl font-bold mb-1">¡Hola, {perfil?.nombre}!</h2>
             <p className="text-brand-100 text-sm mb-4">¿Estás listo para registrar la actividad de hoy?</p>
             
             <label className="text-xs font-bold text-brand-200 uppercase tracking-widest pl-1">Selecciona el Curso</label>
             <select 
               className="w-full mt-1 bg-white/20 border-white/30 text-white rounded-xl py-3 px-4 focus:bg-white focus:text-slate-800 transition-all outline-none font-bold"
               value={selectedCursoId}
               onChange={e => setSelectedCursoId(e.target.value)}
             >
               {cursos.map(c => <option key={c.id} value={c.id} className="text-slate-800">{c.nombre} {c.letra}</option>)}
             </select>
          </div>

          <div className="card p-0 overflow-hidden border-slate-100 shadow-sm">
             <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Alumnos a evaluar</h3>
                <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{estudiantes.length} total</span>
             </div>
             
             <div className="bg-slate-50 px-4 py-6 text-center">
                {estudiantes.length === 0 ? (
                  <EmptyState title="Sin alumnos" description="Este curso no tiene alumnos activos aún." />
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-4">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                       <span className="text-sm font-bold text-slate-600">
                         {Object.keys(registros).length} listos
                       </span>
                       <span className="text-slate-300 mx-2">|</span>
                       <AlertCircle className="w-5 h-5 text-amber-500" />
                       <span className="text-sm font-bold text-slate-600">
                         {estudiantes.length - Object.keys(registros).length} pendientes
                       </span>
                    </div>

                    <button 
                      className="w-full btn-primary py-4 text-sm uppercase tracking-widest shadow-xl shadow-brand-500/30"
                      onClick={startRegistry}
                    >
                       Empezar Registro
                    </button>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* VISTA 2: LLENADO SECUENCIAL DEL REGISTRO */}
      {mode === 'registry' && currentEst && (
        <div className="flex-1 flex flex-col h-full bg-slate-50">
          
          {/* Progress Bar */}
          <div className="h-1.5 w-full bg-slate-200">
             <div 
               className="h-full bg-emerald-500 transition-all duration-300" 
               style={{ width: `${((currentIndex + 1) / estudiantes.length) * 100}%`}}
             />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 flex flex-col items-center">
             
             {/* Header del Alumno */}
             <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-indigo-500" />
                <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-3xl font-black text-indigo-500 mb-3 shadow-inner">
                   {currentEst.nombre[0]}{currentEst.apellido[0]}
                </div>
                <h2 className="text-2xl font-black text-slate-800 leading-tight">{currentEst.nombre} {currentEst.apellido}</h2>
                <div className="flex items-center gap-2 mt-2">
                   <span className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-wider">
                     Alumno {currentIndex + 1} de {estudiantes.length}
                   </span>
                   {registros[currentEst.id] && (
                     <span className="bg-emerald-100 text-emerald-600 text-[10px] uppercase font-bold px-3 py-1 rounded-full flex items-center gap-1">
                       <CheckCircle2 className="w-3 h-3" /> Editando
                     </span>
                   )}
                </div>
             </div>

             {/* Formulario de Preguntas Optimizado para Táctil */}
             <div className="w-full space-y-4">
                
                {/* Boton Magico de Rellenar */}
                <button 
                  onClick={handleAutoFillPositive}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-2xl text-xs font-bold transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" /> Marcar lo predeterminado
                </button>

                {config.map(q => (
                  <div key={q.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <p className="font-bold text-slate-800 mb-3">{q.pregunta}</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {q.opciones.map((opt, i) => {
                        const isSelected = formResponses[q.id]?.r === opt;
                        // Color coding para opciones (asumiendo que indice 0 es positivo, medio es regular, ultimo es negativo)
                        // Para hacerlo universal, simplemente usamos un azul brand intenso si está seleccionado.
                        return (
                          <button
                            key={opt}
                            onClick={() => setFormResponses(prev => ({ ...prev, [q.id]: { ...prev[q.id], r: opt } }))}
                            className={`py-3 px-2 rounded-xl text-xs font-bold transition-all active:scale-95 border-2 ${
                              isSelected 
                                ? 'bg-brand-500 border-brand-600 text-white shadow-md' 
                                : 'bg-slate-50 border-slate-100 text-slate-500'
                            }`}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>

                    {q.permite_comentario && (
                      <div className="mt-3 flex items-center gap-2 bg-slate-50 rounded-xl px-3 border border-slate-100">
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <input 
                          type="text"
                          className="w-full py-2 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                          placeholder="Nota breve..."
                          value={formResponses[q.id]?.c || ''}
                          onChange={e => setFormResponses(prev => ({ ...prev, [q.id]: { ...prev[q.id], c: e.target.value } }))}
                        />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Comentario General */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                   <p className="font-bold text-slate-800 mb-3">Observación General</p>
                   <textarea
                     className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm outline-none focus:border-brand-300 focus:bg-white min-h-[80px]"
                     placeholder="Alguna caída, malestar general, o felicitación por su día..."
                     value={generalComment}
                     onChange={e => setGeneralComment(e.target.value)}
                   />
                </div>

                <div className="h-24" /> {/* Spacer para el boton fijo abajo */}
             </div>
          </div>

          {/* Action Bar Botton Fix */}
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 pb-safe flex items-center gap-3 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
             <button 
               className="p-4 rounded-2xl bg-slate-100 text-slate-500 disabled:opacity-30 active:scale-95 transition-all"
               disabled={currentIndex === 0 || saving}
               onClick={() => {
                 setCurrentIndex(currentIndex - 1)
                 loadStudentDataIntoForm(currentIndex - 1)
               }}
             >
               <ChevronLeft className="w-6 h-6" />
             </button>
             
             <button 
               className="flex-1 btn-primary py-4 rounded-2xl text-base tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-brand-500/20 active:scale-95"
               disabled={saving}
               onClick={() => saveStudentAndProceed(currentIndex + 1)}
             >
               {saving ? <Spinner className="w-5 h-5 text-white" /> : (
                 <>
                   Guardar y Siguiente <ChevronRight className="w-5 h-5" />
                 </>
               )}
             </button>
          </div>
        </div>
      )}

      {/* VISTA 3: FINALIZADO */}
      {mode === 'done' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
           <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center relative shadow-inner animate-fade-in">
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20" />
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
           </div>
           
           <div>
             <h2 className="text-3xl font-black text-slate-800 mb-2">¡Excelente!</h2>
             <p className="text-slate-500">Has completado el registro diario para todos los alumnos del curso de hoy.</p>
           </div>
           
           <button 
             className="btn-primary w-full py-4 text-base rounded-2xl uppercase tracking-widest mt-8"
             onClick={() => setMode('selection')}
           >
             Volver al Inicio
           </button>
        </div>
      )}

    </div>
  )
}
