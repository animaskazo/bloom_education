import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { StatCard } from '@/components/ui'
import { Users, GraduationCap, BookOpen, CreditCard, MessageSquare, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

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

const MESES = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_FULL = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const COLORS = ['#0870f5', '#10b981', '#f59e0b', '#ef4444']


let nivelData: { name: string, value: number }[] = []
const levelNames: Record<string, string> = { pre_basica: 'Pre-básica', basica: 'Básica', media: 'Media' }

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

export default function DashboardPage() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({
    personal: 0, estudiantes: 0, cursos: 0, pagosPendientes: 0, pagosVencidos: 0, comunicados: 0, valorMensualidad: 0,
    recaudadoMes: 0, pendienteMes: 0, gastosMes: 0, balanceNeto: 0
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [pieData, setPieData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (perfil?.rol === 'super_admin') {
      navigate('/establecimientos', { replace: true })
    }
  }, [perfil, navigate])

  useEffect(() => {
    if (!perfil) return
    async function load() {
      const mIdx = new Date().getMonth()
      const currentMonth = (mIdx >= 2 && mIdx <= 11) ? MESES_FULL[mIdx - 2] : 'Marzo'

      const [personal, estudiantes, cursos, pagos, comunicados, estConfig, pagosProv] = await Promise.all([
        supabase.from('personal').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('estudiantes').select('*, cursos(nivel, nombre)').eq('estado', 'activo'),
        supabase.from('cursos').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('pagos_apoderados').select('estado, monto, mes_periodo, fecha_pago'),
        supabase.from('comunicados').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('establecimientos').select('valor_mensualidad').eq('id', perfil.establecimiento_id).single(),
        supabase.from('pagos_proveedores').select('monto, fecha_pago, estado').eq('estado', 'pagado')
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

      setStats({
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
      })

      // Procesar datos para el gráfico
      const data = MESES.map((mes, idx) => {
        const mesNombre = MESES_FULL[idx]
        const pagadoEnMes = pagos.data
          ?.filter(p => p.mes_periodo?.includes(mesNombre) && p.estado === 'pagado')
          .reduce((sum, p) => sum + Number(p.monto), 0) ?? 0

        return {
          mes,
          proyectado: proyectadoMensual,
          recaudado: pagadoEnMes
        }
      })
      setChartData(data)
      setLoading(false)
    }
    load()
  }, [perfil])

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
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => fmt(v)}
                    labelStyle={{ fontSize: 12, fontWeight: 600 }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="proyectado" name="Proyectado" fill="#f1f5f9" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="recaudado" name="Recaudado Real" fill="#0870f5" radius={[4, 4, 0, 0]} barSize={20} style={{ transform: 'translateX(-10px)' }} />
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
        {/* Alertas */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title">Alertas Importantes</h3>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="card-body space-y-3">
            {stats.pagosVencidos > 0 && (
              <Alert color="red" msg={`${stats.pagosVencidos} pagos de apoderados están vencidos`} />
            )}
            <Alert color="yellow" msg="3 contratos de personal vencen este mes" />
            <Alert color="blue" msg="Reunión de padres programada para el viernes" />
            <Alert color="green" msg="Matrícula 2025 alcanzó 94% de capacidad" />
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
    </div>
  )
}

function Alert({ color, msg }: { color: 'red' | 'yellow' | 'blue' | 'green'; msg: string }) {
  const styles = {
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border ${styles[color]}`}>
      {color === 'green' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {msg}
    </div>
  )
}
