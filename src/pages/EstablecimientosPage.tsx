import { useEffect, useState } from 'react'
import { supabase, Establecimiento, Perfil, EstadoGeneral } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Modal, ConfirmDialog, EmptyState, EstadoBadge, Spinner } from '@/components/ui'
import { Plus, Pencil, Trash2, Building2, Search, UserPlus, Shield, Users } from 'lucide-react'

const emptyEstablecimiento = { nombre: '', rut: '', email_contacto: '', telefono: '', direccion: '', estado: 'activo' as 'activo' | 'inactivo' }
const emptyDirectivo = { nombre: '', apellido: '', email: '', rut: '', password: 'Bloom2026*' }

export default function EstablecimientosPage() {
  const { perfil: userPerfil } = useAuth()
  const [rows, setRows] = useState<Establecimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | 'directivo' | 'users' | null>(null)
  const [establishmentUsers, setEstablishmentUsers] = useState<Perfil[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Establecimiento | null>(null)
  const [form, setForm] = useState({ ...emptyEstablecimiento })
  const [dirForm, setDirForm] = useState({ ...emptyDirectivo })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data, error: e } = await supabase.from('establecimientos').select('*').order('nombre')
    if (e) setError(e.message)
    else setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openAdd() {
    setForm({ ...emptyEstablecimiento })
    setEditing(null)
    setError('')
    setModal('add')
  }

  function openEdit(r: Establecimiento) {
    setForm({
      nombre: r.nombre,
      rut: r.rut ?? '',
      email_contacto: r.email_contacto ?? '',
      telefono: r.telefono ?? '',
      direccion: r.direccion ?? '',
      estado: r.estado
    })
    setEditing(r)
    setError('')
    setModal('edit')
  }

  function openDirectivo(r: Establecimiento) {
    setEditing(r)
    setDirForm({ ...emptyDirectivo })
    setError('')
    setModal('directivo')
  }

  async function openUsers(r: Establecimiento) {
    setEditing(r)
    setModal('users')
    setLoadingUsers(true)
    const { data } = await supabase.from('perfiles').select('*').eq('establecimiento_id', r.id).order('nombre')
    setEstablishmentUsers(data ?? [])
    setLoadingUsers(false)
  }

  async function saveEstablecimiento() {
    setSaving(true)
    setError('')
    const { error: e } = editing
      ? await supabase.from('establecimientos').update(form).eq('id', editing.id)
      : await supabase.from('establecimientos').insert([form])

    if (e) {
      setError(e.message)
      setSaving(false)
      return
    }
    setSaving(false)
    setModal(null)
    load()
  }

  async function saveDirectivo() {
    if (!editing) return
    if (!dirForm.nombre || !dirForm.email) {
      setError('Nombre y Email son obligatorios.')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Llamamos a la función de base de datos que creamos con SECURITY DEFINER
      const { error: rpcErr } = await supabase.rpc('crear_directivo_completo', {
        p_email: dirForm.email,
        p_password: dirForm.password,
        p_nombre: dirForm.nombre,
        p_apellido: dirForm.apellido,
        p_rut: dirForm.rut,
        p_establecimiento_id: editing.id
      })

      if (rpcErr) {
        setError(rpcErr.message)
        setSaving(false)
        return
      }

      setSaving(false)
      setModal(null)
      load() 
      alert(`¡Éxito! El directivo ha sido creado en Auth y Perfiles correctamente.`)
    } catch (err: any) {
      setError(err.message || 'Error al crear directivo')
      setSaving(false)
    }
  }

  function formatRUT(value: string) {
    let rut = value.replace(/[^\dkK]/g, '')
    if (rut.length > 1) {
      const dv = rut.slice(-1)
      const num = rut.slice(0, -1)
      rut = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
    }
    return rut.toUpperCase()
  }

  async function toggleEstado(r: Establecimiento) {
    const nuevoEstado = r.estado === 'activo' ? 'inactivo' : 'activo'
    await supabase.from('establecimientos').update({ estado: nuevoEstado }).eq('id', r.id)
    load()
  }

  async function del() {
    if (!delId) return
    const { error: e } = await supabase.from('establecimientos').delete().eq('id', delId)
    if (e) setError(e.message)
    else {
      setDelId(null)
      load()
    }
  }

  const filtered = rows.filter(r =>
    `${r.nombre} ${r.rut}`.toLowerCase().includes(search.toLowerCase())
  )

  if (userPerfil?.rol !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="w-16 h-16 text-slate-200 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Acceso Restringido</h2>
        <p className="text-slate-500">Solo el super-administrador puede ver esta página.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Gestión de Establecimientos"
        subtitle={`${rows.filter(r => r.estado === 'activo').length} activos de ${rows.length} totales`}
        action={
          <button className="btn-primary" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Nuevo Establecimiento
          </button>
        }
      />

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatItem label="Total Establecimientos" val={rows.length} color="bg-blue-50 text-blue-700" />
        <StatItem label="Activos" val={rows.filter(r => r.estado === 'activo').length} color="bg-green-50 text-green-700" />
        <StatItem label="Inactivos" val={rows.filter(r => r.estado === 'inactivo').length} color="bg-slate-50 text-slate-700" />
      </div>

      <div className="card">
        <div className="card-header gap-3">
          <h3 className="section-title">Listado de Colegios / Instituciones</h3>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="input pl-9 w-64"
              placeholder="Buscar por nombre o RUT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner className="w-6 h-6 text-brand-500" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No hay establecimientos"
              description="Comienza agregando el primer establecimiento educacional."
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre / Institución</th>
                  <th>RUT</th>
                  <th>Contacto</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-semibold text-slate-900">{r.nombre}</div>
                      <div className="text-xs text-slate-400">ID: {r.id.split('-')[0]}...</div>
                    </td>
                    <td className="font-mono text-sm">{r.rut || '—'}</td>
                    <td>
                      <div className="text-sm">{r.email_contacto || '—'}</div>
                      <div className="text-xs text-slate-400">{r.telefono || ''}</div>
                    </td>
                    <td className="max-w-[200px] truncate text-sm text-slate-600">
                      {r.direccion || '—'}
                    </td>
                    <td>
                      <button 
                        onClick={() => toggleEstado(r)}
                        className="hover:opacity-80 transition-opacity"
                        title="Click para cambiar estado"
                      >
                        <EstadoBadge estado={r.estado} />
                      </button>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn-ghost btn-sm p-1.5 text-brand-600 hover:bg-brand-50"
                          title="Agregar Directivo"
                          onClick={() => openDirectivo(r)}
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                        <button
                          className="btn-ghost btn-sm p-1.5 text-blue-600 hover:bg-blue-50"
                          title="Ver Usuarios"
                          onClick={() => openUsers(r)}
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          className="btn-ghost btn-sm p-1.5"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50"
                          onClick={() => setDelId(r.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Establecimiento */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Nuevo Establecimiento' : 'Editar Establecimiento'}
        size="lg"
      >
        <div className="p-6 grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl border border-red-200">{error}</div>}
          <F label="Nombre de la Institución" value={form.nombre} onChange={v => setForm({ ...form, nombre: v })} placeholder="Ej: Colegio San Agustín" />
          <F label="RUT Institución" value={form.rut} onChange={v => setForm({ ...form, rut: formatRUT(v) })} placeholder="76.123.456-K" />
          <F label="Email de Contacto" value={form.email_contacto} onChange={v => setForm({ ...form, email_contacto: v })} type="email" />
          <F label="Teléfono" value={form.telefono} onChange={v => setForm({ ...form, telefono: v })} />
          <div className="col-span-2">
            <F label="Dirección" value={form.direccion} onChange={v => setForm({ ...form, direccion: v })} />
          </div>
          <F label="Estado" value={form.estado} onChange={v => setForm({ ...form, estado: v as any })} select options={['activo', 'inactivo']} />
          
          <div className="col-span-2 flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={saveEstablecimiento} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Establecimiento'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Nuevo Directivo */}
      <Modal
        open={modal === 'directivo'}
        onClose={() => setModal(null)}
        title={`Nuevo Directivo para ${editing?.nombre}`}
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 mb-2">
            Este usuario tendrá acceso total a la administración de este establecimiento.
          </p>
          {error && <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg border border-amber-200 leading-relaxed">{error}</div>}
          
          <div className="grid grid-cols-2 gap-4">
            <F label="Nombres" value={dirForm.nombre} onChange={v => setDirForm({ ...dirForm, nombre: v })} />
            <F label="Apellidos" value={dirForm.apellido} onChange={v => setDirForm({ ...dirForm, apellido: v })} />
            <F label="Email" value={dirForm.email} onChange={v => setDirForm({ ...dirForm, email: v })} type="email" />
            <F label="RUT" value={dirForm.rut} onChange={v => setDirForm({ ...dirForm, rut: formatRUT(v) })} />
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Contraseña Provisoria</p>
            <p className="font-mono text-sm text-slate-700">{dirForm.password}</p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={saveDirectivo} disabled={saving}>
              {saving ? 'Creando...' : 'Crear Usuario Directivo'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Lista de Usuarios */}
      <Modal
        open={modal === 'users'}
        onClose={() => setModal(null)}
        title={`Usuarios vinculados a ${editing?.nombre}`}
        size="lg"
      >
        <div className="p-6">
          <div className="table-wrapper max-h-[400px] overflow-y-auto">
            {loadingUsers ? (
              <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-brand-500" /></div>
            ) : establishmentUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No hay usuarios vinculados a este establecimiento.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>RUT</th>
                    <th>Rol</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {establishmentUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-medium text-slate-800">{u.nombre} {u.apellido}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="text-sm font-mono">{u.rut || '—'}</td>
                      <td>
                        <span className="capitalize text-xs bg-slate-100 px-2 py-0.5 rounded-lg">{u.rol}</span>
                      </td>
                      <td><EstadoBadge estado={u.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={del}
        title="Eliminar Establecimiento"
        message="¿Estás seguro de eliminar este establecimiento? Se perderá el vínculo con todos sus datos asociados."
      />
    </div>
  )
}

function StatItem({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full self-start ${color}`}>{label}</span>
      <span className="text-3xl font-bold text-slate-900">{val}</span>
    </div>
  )
}

function F({ label, value, onChange, type = 'text', placeholder = '', select = false, options = [] }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; select?: boolean; options?: string[] }) {
  return (
    <div className="form-group">
      <label className="label">{label}</label>
      {select ? (
        <select className="input" value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— Seleccionar —</option>
          {options.map(o => (
            <option key={o} value={o} className="capitalize">{o}</option>
          ))}
        </select>
      ) : (
        <input
          className="input"
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}
