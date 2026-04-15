import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { StatCard, Modal } from '@/components/ui'
import { Users, GraduationCap, BookOpen, CreditCard, MessageSquare, TrendingUp, AlertCircle, CheckCircle, Calendar, Clock, Info } from 'lucide-react'
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface Stats {
  personal: number
  estudiantes: number
  cursos: number
  pagosPendientes: number
  pagosVencidos: number
  comunicados: number
  valorMensualidad: number
  recaudadoMes: number
  pendienteMes: number
  gastosMes: number
  balanceNeto: number
}

interface Evento {
  id: string
  titulo: string
  descripcion: string
  fecha: string
  hora_inicio: string | null
  tipo: string
  destinatarios: string
}

const MESES = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_FULL = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const COLORS = ['#0870f5', '#10b981', '#f59e0b', '#ef4444']


let nivelData: { name: string, value: number }[] = []
const levelNames: Record<string, string> = { pre_basica: 'Pre-básica', basica: 'Básica', media: 'Media' }

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

export default function DashboardPage() {
  const { perfil, selectedEstablecimientoId } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({
    personal: 0, estudiantes: 0, cursos: 0, pagosPendientes: 0, pagosVencidos: 0, comunicados: 0, valorMensualidad: 0,
    recaudadoMes: 0, pendienteMes: 0, gastosMes: 0, balanceNeto: 0
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Evento[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (perfil?.rol === 'super_admin' && !selectedEstablecimientoId) {
      navigate('/establecimientos', { replace: true })
    }
  }, [perfil, selectedEstablecimientoId, navigate])

  useEffect(() => {
    if (!perfil || !selectedEstablecimientoId) return
    async function load() {
      const mIdx = new Date().getMonth()
      const currentMonth = (mIdx >= 2 && mIdx <= 11) ? MESES_FULL[mIdx - 2] : 'Marzo'

      const [personal, estudiantes, cursos, pagos, comunicados, estConfig, pagosProv] = await Promise.all([
        supabase.from('personal').select('id', { count: 'exact', head: true }).eq('estado', 'activo').eq('establecimiento_id', selectedEstablecimientoId),
        supabase.from('estudiantes').select('*, cursos(nivel, nombre)').eq('estado', 'activo').eq('establecimiento_id', selectedEstablecimientoId),
        supabase.from('cursos').select('id', { count: 'exact', head: true }).eq('estado', 'activo').eq('establecimiento_id', selectedEstablecimientoId),
        supabase.from('pagos_apoderados').select('estado, monto, mes_periodo, fecha_pago').eq('establecimiento_id', selectedEstablecimientoId),
        supabase.from('comunicados').select('id', { count: 'exact', head: true }).eq('estado', 'activo').eq('establecimiento_id', selectedEstablecimientoId),
        supabase.from('establecimientos').select('valor_mensualidad').eq('id', selectedEstablecimientoId).single(),
        supabase.from('pagos_proveedores').select('monto, fecha_pago, estado').eq('estado', 'pagado').eq('establecimiento_id', selectedEstablecimientoId)
      ])

      const countEst = estudiantes.data?.length ?? 0
      const valorMens = estConfig.data?.valor_mensualidad ?? 0
      const proyectadoMensual = countEst * valorMens

      const pendientes = pagos.data?.filter(p => p.estado === 'pendiente').length ?? 0
      const vencidos = pagos.data?.filter(p => p.estado === 'vencido').length ?? 0

      const recMes = pagos.data
        ?.filter(p => p.estado === 'pagado' && p.mes_periodo?.includes(currentMonth))
        .reduce((sum, p) => sum + Number(p.monto), 0) ?? 0

      const penMes = pagos.data
        ?.filter(p => (p.estado === 'pendiente' || p.estado === 'vencido') && p.mes_periodo?.includes(currentMonth))
        .reduce((sum, p) => sum + Number(p.monto), 0) ?? 0

      const gasMes = pagosProv.data
        ?.reduce((sum, p) => sum + Number(p.monto), 0) ?? 0 // Current query might need date filtering

      // Aggregating pie data for Pre-básica courses
      const courses: Record<string, number> = {}
      estudiantes.data?.forEach(e => {
        const c = (e.cursos as any)
        if (c?.nivel === 'pre_basica') {
          const key = c.nombre
          courses[key] = (courses[key] || 0) + 1
        }
      })
      const pData = Object.entries(courses).map(([k, v]) => ({ name: k, value: v }))
      setPieData(pData)

      const finalStats = {
        personal: personal.count ?? 0,
        estudiantes: countEst,
        cursos: cursos.count ?? 0,
        pagosPendientes: pendientes,
        pagosVencidos: vencidos,
        comunicados: comunicados.count ?? 0,
        valorMensualidad: valorMens,
        recaudadoMes: recMes,
        pendienteMes: penMes,
        gastosMes: gasMes,
        balanceNeto: recMes - gasMes
      }
      setStats(finalStats)

      const chart = MESES.map((m, i) => ({
        name: m,
        recaudado: pagos.data?.filter(p => p.estado === 'pagado' && p.mes_periodo?.includes(MESES_FULL[i])).reduce((s, p) => s + Number(p.monto), 0) ?? 0,
        proyectado: proyectadoMensual
      }))
      setChartData(chart)

      // Fetch upcoming events
      const { data: eventsData } = await supabase
        .from('eventos_calendario')
        .select('*')
        .eq('establecimiento_id', selectedEstablecimientoId)
        .gte('fecha', new Date().toISOString().split('T')[0])
        .order('fecha', { ascending: true })
        .limit(5)
      
      setUpcomingEvents(eventsData || [])

      setLoading(false)
    }
    load()
  }, [perfil, selectedEstablecimientoId])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Proyección financiera basada en matrícula real</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Personal Activo" value={loading ? '—' : stats.personal} icon={Users} color="blue" trend="Funcionarios y docentes" />
        <StatCard label="Matrícula Real" value={loading ? '—' : stats.estudiantes} icon={GraduationCap} color="green" trend={`Arancel: ${fmt(stats.valorMensualidad)}`} />
        <StatCard label="Cursos" value={loading ? '—' : stats.cursos} icon={BookOpen} color="purple" trend="Cursos habilitados" />
        <StatCard label="Pagos Pendientes" value={loading ? '—' : stats.pagosPendientes} icon={CreditCard} color="yellow" trend={`${stats.pagosVencidos} vencidos`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="section-title">Recaudación: Proyectado vs Real</h3>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-slate-200" /> Proyectado
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-brand-500 uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-brand-500" /> Recaudado
              </span>
            </div>
          </div>
          <div className="card-body py-10 min-h-[420px]">
            {loading ? (
              <div className="flex items-center justify-center h-[360px] text-slate-400 text-sm">Cargando proyecciones...</div>
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#061224ff' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => fmt(v)}
                    labelStyle={{ fontSize: 12, fontWeight: 600 }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="proyectado" name="Proyectado" fill="#d2e2ecff" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="recaudado" name="Recaudado Real" fill="#12ac52ff" radius={[4, 4, 0, 0]} barSize={40} style={{ transform: 'translateX(-10px)' }}>
                    <LabelList dataKey="name" position="top" style={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="section-title">Alumnos por Curso</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pre-básica</span>
          </div>
          <div className="card-body flex flex-col items-center justify-center py-10 min-h-[420px]">
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">Sin datos de Pre-básica</div>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={130} innerRadius={80} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend verticalAlign="bottom" height={42} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 20 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Eventos */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title">Eventos importantes</h3>
            <Calendar className="w-4 h-4 text-brand-500" />
          </div>
          <div className="card-body">
            {stats.pagosVencidos > 0 && (
              <div className="mb-4 flex items-center gap-2 text-xs px-3 py-2 rounded-xl border bg-red-50 text-red-700 border-red-200 animate-pulse">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-bold">¡Atención! {stats.pagosVencidos} pagos vencidos</span>
              </div>
            )}
            
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {upcomingEvents.map(ev => {
                const colorClass = 
                  ev.destinatarios === 'staff' ? 'bg-indigo-500' :
                  ev.destinatarios === 'apoderados' ? 'bg-amber-500' :
                  'bg-brand-500';
                
                return (
                  <div 
                    key={ev.id} 
                    onClick={() => setSelectedEvent(ev)} 
                    className="flex flex-col bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group overflow-hidden"
                  >
                    <div className={`h-1.5 w-full ${colorClass} opacity-80 group-hover:opacity-100 transition-opacity`} />
                    <div className="p-2 flex flex-col items-center justify-center flex-1">
                      <span className="text-[8px] font-black uppercase text-slate-400 leading-tight">
                        {format(parseISO(ev.fecha), 'MMM', { locale: es })}
                      </span>
                      <span className="text-lg font-black text-slate-800 leading-none my-0.5">
                        {format(parseISO(ev.fecha), 'd')}
                      </span>
                      <h4 className="text-[9px] font-bold text-slate-600 line-clamp-1 uppercase tracking-tight w-full text-center">
                        {ev.titulo}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>

            {!loading && upcomingEvents.length === 0 && !stats.pagosVencidos && (
              <div className="py-12 flex flex-col items-center justify-center opacity-30">
                <Calendar className="w-10 h-10 mb-3" />
                <p className="text-sm italic">Sin eventos próximos</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title">Estado Financiero</h3>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="card-body space-y-3">
            {[
              { label: 'Recaudado este mes', val: fmt(stats.recaudadoMes), color: 'text-emerald-600' },
              { label: 'Pendiente de cobro', val: fmt(stats.pendienteMes), color: 'text-amber-600' },
              { label: 'Gastos a proveedores', val: fmt(stats.gastosMes), color: 'text-slate-600' },
              { label: 'Balance neto estimado', val: fmt(stats.balanceNeto), color: 'text-brand-600', bold: true },
            ].map(({ label, val, color, bold }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">{label}</span>
                <span className={`text-sm ${bold ? 'font-bold' : 'font-medium'} ${color}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Detalle de Evento */}
      <Modal 
        open={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)} 
        title="Detalles de la Actividad"
        size="md"
      >
        {selectedEvent && (
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex flex-col items-center justify-center text-brand-600 shadow-sm border border-brand-100">
                <span className="text-[12px] font-black uppercase tracking-widest">{format(parseISO(selectedEvent.fecha), 'MMM', { locale: es })}</span>
                <span className="text-2xl font-black leading-none">{format(parseISO(selectedEvent.fecha), 'd')}</span>
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{selectedEvent.titulo}</h4>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded-lg">
                    <Users className="w-3.5 h-3.5"/> {selectedEvent.destinatarios}
                  </div>
                  {selectedEvent.hora_inicio && (
                    <div className="flex items-center gap-1.5 text-sm font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-lg">
                      <Clock className="w-4 h-4"/> {selectedEvent.hora_inicio.substring(0,5)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-slate-400"/>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</span>
              </div>
              <p className="text-slate-600 leading-relaxed overflow-y-auto max-h-48 whitespace-pre-wrap">
                {selectedEvent.descripcion || 'Sin descripción adicional disponible.'}
              </p>
            </div>

            <div className="flex justify-end p-2">
              <button 
                className="btn-primary w-full sm:w-auto px-8"
                onClick={() => setSelectedEvent(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

