import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Estudiante, LibretaDiaria, LibretaConfig, PagoApoderado, Curso, Comunicado } from '@/lib/supabase'
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
  Mail,
  Home,
  X,
  Frown,
  Activity,
  Soup
} from 'lucide-react'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO, startOfDay, isBefore } from 'date-fns'
import { es } from 'date-fns/locale'

const MESES_ES = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

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
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'daily' | 'events' | 'inbox' | 'profile'>('daily')

  // Data State
  const [hijos, setHijos] = useState<(Estudiante & { curso?: Curso })[]>([])
  const [selectedHijoId, setSelectedHijoId] = useState<string | null>(null)
  const [eventosWeek, setEventosWeek] = useState<Evento[]>([])
  const [logs, setLogs] = useState<LibretaDiaria[]>([])
  const [configs, setConfigs] = useState<LibretaConfig[]>([])
  const [pagos, setPagos] = useState<PagoApoderado[]>([])
  const [latestComunicado, setLatestComunicado] = useState<Comunicado | null>(null)

  // UI State
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [isPaymentsCollapsed, setIsPaymentsCollapsed] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null)

  useEffect(() => {
    if (perfil) loadDashboardData()
  }, [perfil, selectedEstablecimientoId])

  async function loadDashboardData() {
    setLoading(true)
    try {
      // 1. Obtener TODOS los registros de apoderado (por si hay duplicados administrativos)
      if (!perfil) return

      let orQuery = `perfil_id.eq.${perfil.id}`
      if (perfil.rut) {
        const rutReducido = perfil.rut.replace(/[^0-9kK]/g, '').slice(0, 4)
        if (rutReducido) {
          orQuery += `,rut.ilike.*${rutReducido}*`
        }
      }
      if (perfil.email) {
        orQuery += `,email.eq.${perfil.email}`
      }

      const { data: apodList, error } = await supabase
        .from('apoderados')
        .select('*, id, establecimiento_id, rut, perfil_id')
        .or(orQuery)

      console.log('🎯 DEBUG: Resultado Apoderados ->', apodList)

      if (!apodList || apodList.length === 0) {
        console.warn('Dashboard Apoderado: No se encontró ficha de apoderado para este perfil')
        setLoading(false)
        return
      }

      const mainApod = apodList[0]

      // Vincular automáticamente el perfil_id si estaba vacío y entramos por email
      if (!mainApod.perfil_id && perfil.email) {
        console.log('🎯 DEBUG: Apoderado no tiene perfil_id. Vinculando mediante RPC...')
        await supabase.rpc('vincular_perfil_apoderado', {
          p_email: perfil.email,
          p_perfil_id: perfil.id
        })
      }

      const allApodIds = apodList.map(a => a.id)
      console.log('🎯 DEBUG: Mapeo de Apod_IDs a buscar ->', allApodIds)

      // 2. Obtener hijos combinados
      const { data: links, error: linkErr } = await supabase
        .from('estudiante_apoderado')
        .select('estudiante_id, apoderado_id')
        .in('apoderado_id', allApodIds)

      console.log('🎯 DEBUG: Vínculos obtenidos ->', links, (linkErr ? `ERROR: ${linkErr.message}` : ''))

      if (links && links.length > 0) {
        const uniqueEstIds = Array.from(new Set(links.map(l => l.estudiante_id)))
        console.log('🎯 DEBUG: Alumnos únicos a buscar ->', uniqueEstIds)

        const { data: estData, error: estErr } = await supabase
          .from('estudiantes')
          .select('*, cursos(*)')
          .in('id', uniqueEstIds)

        console.log('🎯 DEBUG: Datos Estudiantes extraidos ->', estData, (estErr ? `ERROR: ${estErr.message}` : ''))

        const formatted = (estData || []).map(e => ({ ...e, curso: e.cursos }))
        console.log('🎯 DEBUG: Hijos seteados en el state ->', formatted)
        setHijos(formatted)

        if (formatted.length > 0) {
          const firstHijoId = formatted[0].id
          setSelectedHijoId(firstHijoId)

          const linkHijo = links.find(l => l.estudiante_id === firstHijoId)
          await loadStudentSpecificData(firstHijoId, linkHijo?.apoderado_id || mainApod.id)
        }
      } else {
        console.warn('🎯 DEBUG: No hay vínculos en estudiante_apoderado')
      }
      // 3. Eventos de la semana
      const now = new Date()
      const start = format(addDays(now, -7), 'yyyy-MM-dd')
      const end = format(addDays(now, 7), 'yyyy-MM-dd')

      const { data: eventData, error: eventErr } = await supabase
        .from('eventos_calendario')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end)

      if (eventErr) {
        console.error('Error fetching dashboard events:', eventErr)
      } else {
        const filtered = (eventData || [])
          .filter(e => {
            const matchEst = e.establecimiento_id === mainApod.establecimiento_id
            const matchDest = ['todos', 'apoderados'].includes(e.destinatarios?.toLowerCase())
            return matchEst && matchDest
          })
          .sort((a, b) => a.fecha.localeCompare(b.fecha))

        setEventosWeek(filtered)
      }

      // 4. Último comunicado importante
      const { data: commData } = await supabase
        .from('comunicados')
        .select('*')
        .eq('establecimiento_id', mainApod.establecimiento_id)
        .eq('estado', 'activo')
        .order('created_at', { ascending: false })
        .limit(1)

      if (commData && commData.length > 0) {
        setLatestComunicado(commData[0])
      }

      // 5. Configs
      const { data: confs } = await supabase
        .from('libreta_configuracion')
        .select('*')
        .eq('establecimiento_id', mainApod.establecimiento_id)
        .order('orden')
      setConfigs(confs || [])

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
          <div className="text-4xl flex-shrink-0 animate-in spin-in-12 duration-700">
            👋
          </div>
          <div className="overflow-hidden">
            <h1 className="text-md font-bold text-[#1E293B] truncate">
              Apoderado de {selectedHijo ? `${selectedHijo.nombre}` : perfil?.nombre}
            </h1>
            <p className="text-xs font-semibold text-slate-400">Buenos días ✨</p>
          </div>
        </div>
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all border-2 ${isActive
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
            <button
              onClick={() => navigate('/calendario')}
              className="text-blue-600 font-bold text-xs"
            >
              Ver Calendario
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
            {eventosWeek.length > 0 ? eventosWeek.map(event => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="min-w-[200px] bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 transition-transform active:scale-95 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex flex-col items-center justify-center flex-shrink-0 border border-red-100">
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">{format(parseISO(event.fecha), 'MMM', { locale: es })}</span>
                  <span className="text-lg font-black text-red-600 leading-none">{format(parseISO(event.fecha), 'd')}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <h4 className="font-bold text-slate-800 text-sm line-clamp-2">{event.titulo}</h4>
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

                    <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
                      {configs.slice(0, 4).map((q) => {
                        const res = log.respuestas[q.id];
                        if (!res) return null;

                        let Icon = Soup;
                        let colorClass = "bg-purple-50 text-purple-600";
                        let tag = "Info";
                        const ask = q.pregunta.toLowerCase();

                        if (ask.includes("comid") || ask.includes("almuerzo") || ask.includes("colac") || ask.includes("aliment") || ask.includes("comi")) {
                          Icon = Soup;
                          colorClass = "bg-emerald-50 text-emerald-600";
                          tag = "¿Almorzó?";
                        } else if (ask.includes("sueño") || ask.includes("siesta") || ask.includes("dormi")) {
                          Icon = Moon;
                          colorClass = "bg-blue-50 text-blue-600";
                          tag = "¿Durmió?";
                        } else if (ask.includes("llorar") || ask.includes("llanto") || ask.includes("triste") || ask.includes("lagrima")) {
                          Icon = Frown;
                          colorClass = "bg-indigo-50 text-indigo-600";
                          tag = "¿Lloró?";
                        } else if (ask.includes("animo") || ask.includes("ánimo") || ask.includes("emoci") || ask.includes("sient")) {
                          Icon = Heart;
                          colorClass = "bg-amber-50 text-amber-600";
                          tag = "Emoción";
                        } else {
                          tag = q.pregunta.split(' ')[0];
                        }

                        return (
                          <StatusIcon key={q.id} icon={Icon} color={colorClass} tag={tag} label={res.r} hasComment={!!res.c} />
                        );
                      })}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="h-px bg-slate-100 mb-4" />

                      {/* Detailed Answers List */}
                      <div className="mb-4">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detalle de Preguntas</h5>
                        <div className="text-sm space-y-0">
                          {configs.map(q => {
                            const res = log.respuestas[q.id];
                            if (!res) return null;
                            return (
                              <div key={`det-${q.id}`} className="py-2 border-b border-slate-50 last:border-0 flex flex-col justify-center">
                                <div className="flex justify-between items-center gap-4">
                                  <span className="text-slate-500 truncate">{q.pregunta}</span>
                                  <span className="font-bold text-slate-800 flex-shrink-0">{res.r}</span>
                                </div>
                                {res.c && (
                                  <p className="text-xs text-brand-600 italic mt-0.5 leading-snug tracking-tight">"{res.c}"</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* General Comment */}
                      {log.comentario_general && (
                        <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Comentario de la tía</p>
                          <p className="text-sm text-slate-600 leading-snug italic">"{log.comentario_general}"</p>
                        </div>
                      )}

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
                          ID: {log.id.substring(0, 6)}
                        </span>
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
          <div
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setIsPaymentsCollapsed(!isPaymentsCollapsed)}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-[#1E293B]">Estado de Mensualidades</h2>
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-200 transition-colors">
                {isPaymentsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                {pagos.filter(p => p.estado === 'pagado').length}/10 PAGADOS
              </span>
            </div>
          </div>

          {!isPaymentsCollapsed && (
            <div className="card p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Grid de Meses */}
              <div className="grid grid-cols-2 gap-3">
                {MESES_ES.map((mes, idx) => {
                  const currentYear = new Date().getFullYear();
                  const mesCompleto = `${mes} ${currentYear}`;
                  const pago = pagos.find(p => p.mes_periodo === mesCompleto || (p.mes_periodo?.startsWith(mes) && p.mes_periodo?.includes(currentYear.toString())));

                  const isPaid = pago?.estado === 'pagado';
                  const isPending = pago?.estado === 'pendiente';
                  const isOverdue = isPending && isBefore(new Date(pago.fecha_vencimiento + 'T23:59:59'), startOfDay(new Date()));

                  return (
                    <div
                      key={mes}
                      className={`p-4 rounded-[24px] border-2 transition-all flex flex-col gap-2 ${isPaid ? 'border-emerald-50 bg-emerald-50/30' :
                        isOverdue ? 'border-red-50 bg-red-50/30' :
                          pago ? 'border-slate-50 bg-slate-50/50' :
                            'border-dashed border-slate-100 bg-transparent opacity-40'
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isPaid ? 'text-emerald-600' : isOverdue ? 'text-red-600' : 'text-slate-400'}`}>
                          {mes.slice(0, 3)}
                        </span>
                        {isPaid ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : pago ? (
                          <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-500 animate-pulse' : 'text-slate-300'}`} />
                        ) : null}
                      </div>

                      <div>
                        <p className={`text-sm font-black ${isPaid ? 'text-emerald-700' : isOverdue ? 'text-red-700' : 'text-slate-600'}`}>
                          {pago ? `$${pago.monto.toLocaleString('es-CL')}` : '—'}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                          {isPaid ? `Pagado ${format(new Date(pago.fecha_pago || pago.created_at || new Date()), 'dd/MM')}` :
                            isOverdue ? 'Vencido' :
                              pago ? 'Pendiente' : 'No generado'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Resumen de Cobros</span>
                  <span className="text-slate-800 font-black">
                    ${pagos.filter(p => p.estado === 'pendiente').reduce((acc, p) => acc + Number(p.monto), 0).toLocaleString('es-CL')} Pendiente
                  </span>
                </div>
                <button className="w-full py-4 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors rounded-2xl">
                  Descargar Cartola de Pagos
                </button>
              </div>
            </div>
          )}
        </section>

      </main>

      {/* ── BOTTOM NAV ────────────────────────────────────────────────────── */}


      {/* ── EVENT MODAL (Fullscreen / Sheet) ────────────────────────────── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in slide-in-from-bottom-full duration-300 font-sans max-w-md mx-auto shadow-2xl">
          <div className="flex justify-between items-center px-6 py-6 border-b border-slate-100">
            <h3 className="font-black text-lg text-[#1E293B]">Detalle de Actividad</h3>
            <button
              onClick={() => setSelectedEvent(null)}
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 active:scale-95 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 no-scrollbar">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-3xl bg-red-50 flex flex-col items-center justify-center flex-shrink-0 border border-red-100 shadow-sm">
                <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">{format(parseISO(selectedEvent.fecha), 'MMM', { locale: es })}</span>
                <span className="text-2xl font-black text-red-600 leading-none">{format(parseISO(selectedEvent.fecha), 'd')}</span>
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#1E293B] leading-tight">{selectedEvent.titulo}</h2>
              </div>
            </div>

            <div className="bg-[#F8F9FE] rounded-[24px] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Horario</p>
                  <p className="text-sm font-bold text-slate-700">{selectedEvent.hora_inicio?.substring(0, 5) || 'Todo el día'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Día</p>
                  <p className="text-sm font-bold text-slate-700 capitalize">{format(parseISO(selectedEvent.fecha), 'EEEE', { locale: es })}</p>
                </div>
              </div>
            </div>

            {selectedEvent.descripcion ? (
              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Información Adicional</h4>
                <div className="bg-white border-2 border-slate-50 rounded-[24px] p-6">
                  <p className="text-slate-600 leading-relaxed text-sm">{selectedEvent.descripcion}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Información Adicional</h4>
                <div className="bg-slate-50/50 rounded-[24px] p-6 flex flex-col items-center justify-center text-center">
                  <p className="text-slate-400 leading-relaxed text-sm italic">Este evento no tiene descripción adicional cargada.</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-white border-t border-slate-100">
            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-[20px] shadow-lg shadow-blue-100 active:scale-95 transition-transform"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

function StatusIcon({ icon: Icon, color, tag, label, hasComment }: any) {
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-[64px]">
      <span className="text-[8px] font-black tracking-widest uppercase text-slate-400 truncate w-full text-center whitespace-nowrap">{tag}</span>
      <div className={`w-11 h-11 rounded-xl flex flex-shrink-0 items-center justify-center relative ${color}`}>
        <Icon className="w-5 h-5" />
        {hasComment && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-white shadow-sm" />
        )}
      </div>
      <div className="flex flex-col items-center gap-1 w-full px-1">
        <span className="text-[9px] font-black tracking-tighter uppercase whitespace-normal text-center leading-none opacity-80 flex items-center justify-center truncate w-full">{label}</span>
      </div>
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
