import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase, Establecimiento } from '@/lib/supabase'
import { PageHeader, Spinner } from '@/components/ui'
import { User, Lock, Bell, Shield, CheckCircle, Building } from 'lucide-react'
import { useEffect } from 'react'

export default function ConfiguracionPage() {
  const { perfil, selectedEstablecimientoId } = useAuth()
  const isSuper = perfil?.rol === 'super_admin'
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [estData, setEstData] = useState<Establecimiento | null>(null)
  const [form, setForm] = useState({
    nombre: perfil?.nombre ?? '',
    apellido: perfil?.apellido ?? '',
    telefono: perfil?.telefono ?? '',
    email: perfil?.email ?? '',
  })
  const [passForm, setPassForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  async function saveEstablishment() {
    if (!estData || !selectedEstablecimientoId) return
    setSaving(true); setError('')
    
    const { error: err } = await supabase.from('establecimientos')
      .update({ valor_mensualidad: estData.valor_mensualidad })
      .eq('id', selectedEstablecimientoId)
    
    if (err) {
      setError(err.message)
      console.error('Save error:', err)
    } else {
      setSaved('est')
      setTimeout(() => setSaved(''), 3000)
    }
    setSaving(false)
  }

  async function saveProfile() {
    if (!perfil) return
    setSaving(true)
    await supabase.from('perfiles').update({ nombre: form.nombre, apellido: form.apellido, telefono: form.telefono }).eq('id', perfil.id)
    setSaving(false); setSaved('perfil')
    setTimeout(() => setSaved(''), 3000)
  }

  async function changePassword() {
    if (passForm.next !== passForm.confirm) return
    setSaving(true)
    await supabase.auth.updateUser({ password: passForm.next })
    setPassForm({ current: '', next: '', confirm: '' })
    setSaving(false); setSaved('pass')
    setTimeout(() => setSaved(''), 3000)
  }

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
          {saved==='perfil' && <span className="flex items-center gap-1 text-emerald-600 text-sm"><CheckCircle className="w-4 h-4"/>Guardado</span>}
        </div>
        <div className="card-body grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Nombre</label>
            <input className="input" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Apellido</label>
            <input className="input" value={form.apellido} onChange={e=>setForm({...form,apellido:e.target.value})} />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input className="input" value={form.email} disabled />
          </div>
          <div className="form-group">
            <label className="label">Teléfono</label>
            <input className="input" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} placeholder="+56912345678" />
          </div>
          <div className="form-group">
            <label className="label">Rol del sistema</label>
            <div className="input bg-slate-50 text-slate-500 cursor-not-allowed">{rolLabels[perfil?.rol??'']??'—'}</div>
          </div>
          <div className="form-group">
            <label className="label">RUT</label>
            <div className="input bg-slate-50 text-slate-500 cursor-not-allowed font-mono">{perfil?.rut??'—'}</div>
          </div>
          <div className="col-span-2 flex justify-end">
            <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving?'Guardando...':'Guardar cambios'}</button>
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
            {saved==='est' && <span className="flex items-center gap-1 text-emerald-600 text-sm font-bold animate-bounce"><CheckCircle className="w-4 h-4"/>¡Cambios Guardados!</span>}
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
                        className="input pl-7 text-lg font-bold text-brand-700" 
                        type="number" 
                        placeholder="0"
                        value={estData?.valor_mensualidad ?? ''} 
                        onChange={e=>setEstData({...estData, valor_mensualidad: parseInt(e.target.value) || 0})} 
                    />
                  </div>
                </div>
                {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl">{error}</div>}
                <div className="flex justify-end pt-2 border-t border-slate-50">
                  <button className="btn-primary" onClick={saveEstablishment} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Contraseña */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <h3 className="section-title">Cambiar Contraseña</h3>
          </div>
          {saved==='pass' && <span className="flex items-center gap-1 text-emerald-600 text-sm"><CheckCircle className="w-4 h-4"/>Actualizada</span>}
        </div>
        <div className="card-body grid grid-cols-1 gap-4">
          <div className="form-group">
            <label className="label">Nueva contraseña</label>
            <input className="input" type="password" value={passForm.next} onChange={e=>setPassForm({...passForm,next:e.target.value})} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label className="label">Confirmar nueva contraseña</label>
            <input className="input" type="password" value={passForm.confirm} onChange={e=>setPassForm({...passForm,confirm:e.target.value})} placeholder="••••••••" />
            {passForm.next && passForm.confirm && passForm.next!==passForm.confirm && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={changePassword} disabled={!passForm.next || passForm.next!==passForm.confirm || saving}>
              {saving ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </div>
      </div>

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
