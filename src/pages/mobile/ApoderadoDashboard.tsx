import { useEffect, useState } from 'react'
import { supabase, Estudiante, LibretaDiaria, PagoApoderado, Curso, Comunicado } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import { 
  Bell, 
  Baby, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Utensils, 
  Moon, 
  Smile, 
  MessageCircle, 
  CreditCard,
  CheckCircle2,
  Clock,
  User,
  Heart,
  ChevronRight,
  TrendingUp,
  Mail,
  Home
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ── TYPES ──────────────────────────────────────────────────────────────
interface Evento {
  id: string
  titulo: string
  descripcion: string
  fecha: string
  hora_inicio: string | null
  tipo: string
  destinatarios: string
}

export default function ApoderadoDashboard() {
  const { perfil, selectedEstablecimientoId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'daily' | 'events' | 'inbox' | 'profile'>('daily')
  
  // Data State
  const [hijos, setHijos] = useState<(Estudiante & { curso?: Curso })[]>([])
  const [selectedHijoId, setSelectedHijoId] = useState<string | null>(null)
  const [eventosWeek, setEventosWeek] = useState<Evento[]>([])
  const [logs, setLogs] = useState<LibretaDiaria[]>([])
  const [pagos, setPagos] = useState<PagoApoderado[]>([])
  const [latestComunicado, setLatestComunicado] = useState<Comunicado | null>(null)
  
  // UI State
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  useEffect(() => {
    if (perfil) loadDashboardData()
  }, [perfil, selectedEstablecimientoId])

  async function loadDashboardData() {
    setLoading(true)
    try {
      // 1. Obtener registro de apoderado
      const { data: apodData } = await supabase
        .from('apoderados')
        .select('id, establecimiento_id')
        .eq('perfil_id', perfil?.id)
        .maybeSingle()

      if (!apodData) return

      // 2. Obtener hijos
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
          .eq('estado', 'activo')
        
        const formatted = (estData || []).map(e => ({ ...e, curso: e.cursos }))
        setHijos(formatted)
        if (formatted.length > 0) {
          const firstHijoId = formatted[0].id
          setSelectedHijoId(firstHijoId)
          await loadStudentSpecificData(firstHijoId, apodData.id)
        }
      }

      // 3. Eventos de la semana
      const start = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const { data: eventData } = await supabase
        .from('eventos_calendario')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end)
        .in('destinatarios', ['todos', 'apoderados'])
        .order('fecha', { ascending: true })
      
      setEventosWeek(eventData || [])

      // 4. Último comunicado importante
      const { data: commData } = await supabase
        .from('comunicados')
        .select('*')
        .eq('establecimiento_id', apodData.establecimiento_id)
        .eq('estado', 'activo')
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (commData && commData.length > 0) {
        setLatestComunicado(commData[0])
      }

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadStudentSpecificData(estId: string, apodId: string) {
    if (!estId) return;

    // Libreta diaria
    const { data: logData } = await supabase
      .from('libreta_diaria')
      .select('*')
      .eq('estudiante_id', estId)
      .order('fecha', { ascending: false })
      .limit(7)
    setLogs(logData || [])

    // Pagos del alumno
    // Nota: Filtramos por estudiante_id para traer exactamente los cobros de ese niño.
    const { data: payData } = await supabase
      .from('pagos_apoderados')
      .select('*')
      .eq('estudiante_id', estId)
      .order('fecha_vencimiento', { ascending: false })
    
    console.log(`Pagos cargados para ${estId}:`, payData);
    setPagos(payData || [])
  }

  const handleConfirmReading = async (logId: string) => {
    const { error } = await supabase
      .from('libreta_diaria' as any) // Assuming we add this field
      .update({ revisado_at: new Date().toISOString() })
      .eq('id', logId)
    
    if (!error) {
       setLogs(prev => prev.map(l => l.id === logId ? { ...l, revisado_at: new Date().toISOString() } : l))
    }
  }

  const selectedHijo = hijos.find(h => h.id === selectedHijoId)

  if (loading) return <div className="flex h-screen items-center justify-center bg-white"><Spinner className="w-8 h-8 text-blue-600" /></div>

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FE] pb-24 font-sans max-w-md mx-auto shadow-2xl relative">
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100 bg-slate-200">
             <img src={`https://ui-avatars.com/api/?name=${perfil?.nombre}+${perfil?.apellido}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">¡Hola, {perfil?.nombre}!</h1>
            <p className="text-xs font-semibold text-slate-400">Buenos días ✨</p>
          </div>
        </div>
        <button className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-50 active:scale-95 transition-transform">
           <Bell className="w-5 h-5 text-blue-600" />
           <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      {/* ── CHILDREN SELECTOR (Only if multiple) ────────────────────────── */}
      {hijos.length > 1 && (
        <section className="px-6 mb-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {hijos.map(h => {
              const isActive = h.id === selectedHijoId;
              return (
                <button
                  key={h.id}
                  onClick={() => {
                    setSelectedHijoId(h.id);
                    loadStudentSpecificData(h.id, perfil?.id || '');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all border-2 ${
                    isActive 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'bg-white border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Baby className="w-3.5 h-3.5" />
                  {h.nombre} {h.apellido}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <main className="flex-1 overflow-y-auto px-6 space-y-8 scroll-smooth no-scrollbar">
        
        {/* ── REMINDER CARD ─────────────────────────────────────────────────── */}
        {latestComunicado && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="bg-[#007AFF] rounded-[32px] p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-4 -translate-y-4">
                  <Bell className="w-24 h-24" />
               </div>
               <div className="flex items-start gap-4 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                     <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">AVISO RECIENTE</h4>
                    <h3 className="text-xl font-bold leading-tight">{latestComunicado.titulo}</h3>
                  </div>
               </div>
               <p className="text-sm text-blue-50 opacity-90 line-clamp-2 mb-2">{latestComunicado.contenido}</p>
               <button className="text-[11px] font-bold underline decoration-white/30 underline-offset-4">Ver detalle</button>
            </div>
          </section>
        )}

        {/* ── WEEKLY SCHEDULE (Horizontal) ──────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#1E293B]">Esta Semana</h2>
            <button className="text-blue-600 font-bold text-xs">Ver Calendario</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
            {eventosWeek.length > 0 ? eventosWeek.map(event => (
              <div key={event.id} className="min-w-[200px] bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 transition-transform active:scale-95">
                 <div className="w-12 h-12 rounded-2xl bg-red-50 flex flex-col items-center justify-center flex-shrink-0 border border-red-100">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">{format(parseISO(event.fecha), 'MMM', { locale: es })}</span>
                    <span className="text-lg font-black text-red-600 leading-none">{format(parseISO(event.fecha), 'd')}</span>
                 </div>
                 <div className="flex flex-col gap-0.5">
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{event.titulo}</h4>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                       <Clock className="w-3 h-3" /> {event.hora_inicio?.substring(0, 5) || 'Todo el día'}
                    </p>
                 </div>
              </div>
            )) : (
              <div className="w-full py-4 text-center text-slate-300 italic text-sm">No hay actividades agendadas</div>
            )}
          </div>
        </section>

        {/* ── DAILY HISTORY (Accordion) ─────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-black text-[#1E293B]">Libreta Diaria</h2>
          <div className="space-y-4">
            {logs.map((log, idx) => {
              const isExpanded = expandedLogId === log.id;
              const isToday = isSameDay(new Date(log.fecha + 'T12:00:00'), new Date());
              const isChecked = (log as any).revisado_at != null;

              return (
                <div key={log.id} className={`bg-white rounded-[32px] overflow-hidden border-2 transition-all duration-300 ${isExpanded ? 'border-blue-100 shadow-xl' : 'border-transparent shadow-sm'}`}>
                  <div 
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-6 cursor-pointer"
                  >
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex flex-col">
                        <h4 className="text-lg font-black text-[#1E293B]">
                          {isToday ? 'Hoy, ' : ''}{format(new Date(log.fecha + 'T12:00:00'), "EEEE d", { locale: es })}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isToday ? 'ÚLTIMA ENTRADA' : 'FECHA ANTERIOR'}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                         {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                       <StatusIcon icon={Utensils} color="bg-emerald-50 text-emerald-600" label="OK" />
                       <StatusIcon icon={TrendingUp} color="bg-amber-50 text-amber-600" label="MUY BIEN" />
                       <StatusIcon icon={Moon} color="bg-blue-50 text-blue-600" label="1.5H" />
                       <StatusIcon icon={Smile} color="bg-green-50 text-green-600" label="FELIZ" />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="h-px bg-slate-100 mb-6" />
                      
                      <div className="space-y-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">COMENTARIOS DE LA TÍA</h5>
                        
                        <div className="bg-[#F8F9FE] rounded-3xl p-5 space-y-4">
                          {log.comentario_general ? (
                            <div className="relative pl-4 border-l-2 border-blue-500">
                              <p className="text-sm text-slate-600 leading-relaxed italic">"{log.comentario_general}"</p>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Sin comentarios adicionales hoy.</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          {isChecked ? (
                            <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                               <CheckCircle2 className="w-4 h-4" /> Leído
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleConfirmReading(log.id); }}
                              className="bg-blue-600 text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg shadow-blue-100 active:scale-95 transition-transform"
                            >
                               Confirmar Lectura
                            </button>
                          )}
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider italic font-mono">
                             ID: {log.id.substring(0,6)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── PAYMENTS SECTION ──────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#1E293B]">Información de Pago</h2>
            {pagos.filter(p => p.estado === 'pendiente').length > 0 && (
               <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                 {pagos.filter(p => p.estado === 'pendiente').length} PENDIENTES
               </span>
            )}
          </div>
          <div className="card p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm space-y-4">
             {/* Resumen de Saldo */}
             <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100/50 mb-2">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total por pagar</p>
                      <p className="text-lg font-black text-slate-800">
                        ${pagos.filter(p => p.estado === 'pendiente').reduce((acc, p) => acc + Number(p.monto), 0).toLocaleString('es-CL')}
                      </p>
                   </div>
                </div>
                <div className="text-right">
                   <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
             </div>

             <div className="space-y-2">
                {pagos.slice(0, 3).map(pago => (
                  <div key={pago.id} className="flex items-center justify-between py-3 last:border-0 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${pago.estado === 'pagado' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-slate-800">{pago.mes_periodo || pago.concepto}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(pago.fecha_vencimiento + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm text-slate-800">${pago.monto.toLocaleString('es-CL')}</p>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${pago.estado === 'pagado' ? 'text-emerald-500' : 'text-red-500'}`}>
                            {pago.estado === 'pagado' ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                      </div>
                  </div>
                ))}
                {pagos.length === 0 && <p className="text-center text-slate-300 italic text-sm py-4">Sin historial de pagos</p>}
             </div>
             <button className="w-full py-4 text-xs font-bold text-blue-600 border-t border-slate-50 mt-2 hover:bg-slate-50 transition-colors rounded-b-xl">
               Ver Historial Completo
             </button>
          </div>
        </section>

      </main>

      {/* ── BOTTOM NAV ────────────────────────────────────────────────────── */}
      <nav className="fixed bottom-6 left-6 right-6 bg-white/90 backdrop-blur-xl border border-white/50 h-20 rounded-[40px] shadow-2xl flex items-center justify-between px-8 z-50 ring-1 ring-slate-200/50">
         <NavItem icon={Home} label="DAILY" active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} />
         <NavItem icon={Calendar} label="EVENTS" active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
         <NavItem icon={Mail} label="INBOX" active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} />
         <NavItem icon={User} label="PROFILE" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
      </nav>

    </div>
  )
}

function StatusIcon({ icon: Icon, color, label }: any) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
       <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm border border-black/5 ${color}`}>
          <Icon className="w-6 h-6" />
       </div>
       <span className="text-[10px] font-black tracking-tighter uppercase whitespace-nowrap opacity-60">{label}</span>
    </div>
  )
}

function NavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
       <div className={`w-12 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 -translate-y-1' : 'text-slate-400 hover:text-slate-600'}`}>
          <Icon className="w-5 h-5" />
       </div>
       <span className={`text-[8px] font-black tracking-widest transition-opacity duration-300 ${active ? 'opacity-100 text-blue-600' : 'opacity-40 text-slate-400'}`}>{label}</span>
    </button>
  )
}
