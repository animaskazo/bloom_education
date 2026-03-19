import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { StatCard } from '@/components/ui'
import { Users, GraduationCap, BookOpen, CreditCard, MessageSquare, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

interface Stats {
  personal: number
  estudiantes: number
  cursos: number
  pagosPendientes: number
  pagosVencidos: number
  comunicados: number
}

const COLORS = ['#0870f5', '#10b981', '#f59e0b', '#ef4444']

const pagosMes = [
  { mes: 'Ago', pagado: 2800000, pendiente: 400000 },
  { mes: 'Sep', pagado: 3100000, pendiente: 320000 },
  { mes: 'Oct', pagado: 2950000, pendiente: 580000 },
  { mes: 'Nov', pagado: 3300000, pendiente: 210000 },
  { mes: 'Dic', pagado: 3050000, pendiente: 390000 },
  { mes: 'Ene', pagado: 3400000, pendiente: 280000 },
]

const nivelData = [
  { name: 'Pre-básica', value: 45 },
  { name: 'Básica', value: 280 },
  { name: 'Media', value: 160 },
]

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

export default function DashboardPage() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ personal: 0, estudiantes: 0, cursos: 0, pagosPendientes: 0, pagosVencidos: 0, comunicados: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (perfil?.rol === 'super_admin') {
      navigate('/establecimientos', { replace: true })
    }
  }, [perfil, navigate])

  useEffect(() => {
    if (!perfil) return
    async function load() {
      const [personal, estudiantes, cursos, pagos, comunicados] = await Promise.all([
        supabase.from('personal').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('estudiantes').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('cursos').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('pagos_apoderados').select('estado'),
        supabase.from('comunicados').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
      ])
      const pendientes = pagos.data?.filter(p => p.estado === 'pendiente').length ?? 0
      const vencidos = pagos.data?.filter(p => p.estado === 'vencido').length ?? 0
      setStats({
        personal: personal.count ?? 0,
        estudiantes: estudiantes.count ?? 0,
        cursos: cursos.count ?? 0,
        pagosPendientes: pendientes,
        pagosVencidos: vencidos,
        comunicados: comunicados.count ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen general del establecimiento educacional</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Personal Activo" value={loading ? '—' : stats.personal} icon={Users} color="blue" trend="Funcionarios y docentes" />
        <StatCard label="Estudiantes" value={loading ? '—' : stats.estudiantes} icon={GraduationCap} color="green" trend="Matriculados activos" />
        <StatCard label="Cursos" value={loading ? '—' : stats.cursos} icon={BookOpen} color="purple" trend="Cursos habilitados" />
        <StatCard label="Pagos Pendientes" value={loading ? '—' : stats.pagosPendientes} icon={CreditCard} color="yellow" trend={`${stats.pagosVencidos} vencidos`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="section-title">Recaudación Mensual</h3>
            <span className="badge-blue">Últimos 6 meses</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pagosMes} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} labelStyle={{ fontSize: 12 }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="pagado" name="Pagado" fill="#0870f5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pendiente" name="Pendiente" fill="#fbbf24" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="section-title">Alumnos por Nivel</h3>
          </div>
          <div className="card-body flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={nivelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={48}>
                  {nivelData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
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
              { label: 'Recaudado este mes', val: fmt(3400000), color: 'text-emerald-600' },
              { label: 'Pendiente de cobro', val: fmt(280000), color: 'text-amber-600' },
              { label: 'Pagos a proveedores', val: fmt(1200000), color: 'text-slate-600' },
              { label: 'Balance neto estimado', val: fmt(1920000), color: 'text-brand-600', bold: true },
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
