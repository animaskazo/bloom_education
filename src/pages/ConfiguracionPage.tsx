import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, Establecimiento } from '@/lib/supabase'
import { PageHeader, Spinner } from '@/components/ui'
import { User, Bell, Shield, CheckCircle, Building } from 'lucide-react'
import { useEffect } from 'react'

export default function ConfiguracionPage() {
  const { perfil, selectedEstablecimientoId } = useAuth()
  const isSuper = perfil?.rol === 'super_admin'
  const [loading, setLoading] = useState(true)
  const [estData, setEstData] = useState<Establecimiento | null>(null)
  const [form, setForm] = useState({
    nombre: perfil?.nombre ?? '',
    apellido: perfil?.apellido ?? '',
    telefono: perfil?.telefono ?? '',
    email: perfil?.email ?? '',
  })

  useEffect(() => {
    async function init() {
      if (selectedEstablecimientoId) {
        const { data } = await supabase.from('establecimientos').select('*').eq('id', selectedEstablecimientoId).single()
        if (data) setEstData(data)
      }
      setLoading(false)
    }
    init()
  }, [selectedEstablecimientoId])



  const rolLabels: Record<string, string> = {
    direccion: 'Dirección', profesor: 'Profesor/a', administrativo: 'Administrativo/a', apoderado: 'Apoderado/a'
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <PageHeader title="Configuración" subtitle="Administra tu perfil y preferencias de cuenta" />

      {/* Perfil */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <h3 className="section-title">Datos del Perfil</h3>
          </div>
        </div>
        <div className="card-body grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Nombre</label>
            <input className="input bg-slate-50 text-slate-500 cursor-not-allowed" value={form.nombre} disabled />
          </div>
          <div className="form-group">
            <label className="label">Apellido</label>
            <input className="input bg-slate-50 text-slate-500 cursor-not-allowed" value={form.apellido} disabled />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" value={form.email} disabled />
          </div>
          <div className="form-group">
            <label className="label">Teléfono</label>
            <input className="input bg-slate-50 text-slate-500 cursor-not-allowed" value={form.telefono} disabled />
          </div>
          <div className="form-group">
            <label className="label">Rol del sistema</label>
            <div className="input bg-slate-50 text-slate-500 cursor-not-allowed">{rolLabels[perfil?.rol??'']??'—'}</div>
          </div>
          <div className="form-group">
            <label className="label">RUT</label>
            <div className="input bg-slate-50 text-slate-500 cursor-not-allowed font-mono">{perfil?.rut??'—'}</div>
          </div>
        </div>
      </div>

      {/* Configuración Establecimiento (Solo Dirección/Admin) */}
      {(perfil?.rol === 'direccion' || perfil?.rol === 'super_admin') && (
        <div className="card border-l-4 border-brand-500">
          <div className="card-header bg-brand-50/30">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-brand-600" />
              <h3 className="section-title text-brand-900">Configuración de la Institución</h3>
            </div>
          </div>
          <div className="card-body space-y-4">
            {loading ? <div className="flex justify-center p-4"><Spinner className="w-5 h-5 text-brand-500" /></div> : !estData ? (
               <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs">
                 Tu cuenta no está vinculada a un establecimiento específico para configurar sus aranceles.
               </div>
            ) : (
              <>
                <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700">Monto de Mensualidad Escolar</p>
                    <p className="text-xs text-slate-400">Este valor se utilizará como base cuando generes los cobros masivos de todo el año.</p>
                </div>
                <div className="form-group">
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                        className="input pl-7 text-lg font-bold text-slate-500 bg-slate-50 cursor-not-allowed" 
                        type="number" 
                        value={estData?.valor_mensualidad ?? ''} 
                        disabled 
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}



      {/* Info sistema */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-slate-400"/><h3 className="section-title">Información del Sistema</h3></div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Plataforma', 'Bloom SaaS v1.0'],
              ['Base de Datos', 'Supabase PostgreSQL'],
              ['Región', 'Sudamérica (sa-east-1)'],
              ['País', 'Chile'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
