import { useEffect, useState } from 'react'
import { supabase, Personal, EstadoGeneral } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Modal, ConfirmDialog, EmptyState, EstadoBadge, Spinner } from '@/components/ui'
import { Plus, Pencil, Trash2, Users, Search, Key, ShieldCheck, ShieldAlert } from 'lucide-react'

const CARGOS = ['Directora/or','Subdirector/a','Profesor/a','Inspector/a General','Orientador/a','Administrativo/a','Auxiliar','Paradocente']
const DPTOS  = ['Dirección','Académico','Convivencia','Administración','Servicios Generales']
const CONTRATOS = ['planta','contrata','honorarios','reemplazo']

const emptyForm = { rut:'', nombre:'', apellido:'', email:'', telefono:'', cargo:'', departamento:'', fecha_ingreso:'', tipo_contrato:'contrata' as string, sueldo_base:'', estado:'activo' as EstadoGeneral, password:'', rol: '' }

export default function PersonalPage() {
  const { perfil, selectedEstablecimientoId } = useAuth()
  const [rows, setRows]       = useState<Personal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState<'add'|'edit'|null>(null)
  const [delId, setDelId]     = useState<string|null>(null)
  const [editing, setEditing] = useState<Personal|null>(null)
  const [form, setForm]       = useState({ ...emptyForm })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [hasAuth, setHasAuth] = useState<Record<string, boolean>>({})

  async function load(silent = false) {
    if (!selectedEstablecimientoId) return
    if (!silent) setLoading(true)
    
    // 1. Cargar lista de personal
    const { data } = await supabase.from('personal').select('*').eq('establecimiento_id', selectedEstablecimientoId).order('apellido')
    setRows(data ?? [])
    
    // 2. Cargar quiénes tienen acceso real (RPC)
    const { data: authData } = await supabase.rpc('obtener_staff_con_acceso')
    if (authData) {
      const authMap: Record<string, boolean> = {}
      authData.forEach((item: { id: string }) => {
        authMap[item.id] = true
      })
      setHasAuth(authMap)
    }

    if (!silent) setLoading(false)
  }
  useEffect(() => { load() }, [selectedEstablecimientoId])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  function openAdd()  { setForm({ ...emptyForm }); setEditing(null); setError(''); setModal('add') }
  function openEdit(r: any) {
    setForm({ rut: r.rut, nombre: r.nombre, apellido: r.apellido, email: r.email??'', telefono: r.telefono??'', cargo: r.cargo, departamento: r.departamento??'', fecha_ingreso: r.fecha_ingreso??'', tipo_contrato: r.tipo_contrato??'contrata', sueldo_base: r.sueldo_base?.toString()??'', estado: r.estado, password: '', rol: r.rol || '' })
    setEditing(r); setError(''); setModal('edit')
  }

  async function save() {
    if (!selectedEstablecimientoId) {
      setError('No hay un establecimiento seleccionado.')
      return
    }

    setSaving(true); setError('')
    try {
      const payload = { 
        rut: form.rut, 
        nombre: form.nombre, 
        apellido: form.apellido, 
        email: form.email||null, 
        telefono: form.telefono||null, 
        cargo: form.cargo, 
        departamento: form.departamento||null, 
        fecha_ingreso: form.fecha_ingreso||null, 
        tipo_contrato: (form.tipo_contrato as any)||null, 
        sueldo_base: form.sueldo_base ? parseFloat(form.sueldo_base) : null, 
        estado: form.estado,
        establecimiento_id: selectedEstablecimientoId
      }

      // Si tiene clave -> Delegamos TODO a la función maestra SQL (RPC)
      if (form.password && form.password.length >= 6) {
        const { error: authErr } = await supabase.rpc('crear_acceso_staff', {
          p_rut: form.rut,
          p_password: form.password,
          p_nombre: form.nombre,
          p_apellido: form.apellido,
          p_email: form.email || `${form.rut.replace(/[^0-9kK]/g, '')}@bloom-staff.cl`,
          p_rol: (perfil?.rol === 'super_admin' && form.rol) ? form.rol : 
                 (form.cargo.toLowerCase().includes('director') ? 'direccion' : 
                  form.cargo.toLowerCase().includes('profesor') ? 'profesor' : 'administrativo'),
          p_establecimiento_id: selectedEstablecimientoId
        })
        if (authErr) throw authErr
      } 
      // Si NO tiene clave -> Guardado normal de ficha laboral
      else {
        const { error: e } = editing
          ? await supabase.from('personal').update(payload).eq('id', editing.id)
          : await supabase.from('personal').insert([payload])
        if (e) throw e
      }

      setModal(null)
      setSuccess(editing ? 'Personal actualizado correctamente' : 'Personal creado correctamente')
      await load(true)
    } catch (e: any) {
      if (e.code === '23505') setError('Este RUT ya se encuentra registrado.')
      else setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    if (!delId) return
    await supabase.from('personal').delete().eq('id', delId)
    setSuccess('Funcionario eliminado correctamente')
    setDelId(null); load(true)
  }

  const filtered = rows.filter(r => `${r.nombre} ${r.apellido} ${r.rut} ${r.cargo}`.toLowerCase().includes(search.toLowerCase()))
  const fmt = (n?: number|null) => n ? new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n) : '—'

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Gestión de Personal"
        subtitle={`${rows.filter(r=>r.estado==='activo').length} funcionarios activos`}
        action={<button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4"/>Agregar funcionario</button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Total personal', val: rows.length, color:'bg-blue-50 text-blue-700' },
          { label:'Planta', val: rows.filter(r=>r.tipo_contrato==='planta').length, color:'bg-green-50 text-green-700' },
          { label:'Contrata', val: rows.filter(r=>r.tipo_contrato==='contrata').length, color:'bg-purple-50 text-purple-700' },
          { label:'Honorarios', val: rows.filter(r=>r.tipo_contrato==='honorarios').length, color:'bg-amber-50 text-amber-700' },
        ].map(s=>(
          <div key={s.label} className="card p-4 flex flex-col gap-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full self-start ${s.color}`}>{s.label}</span>
            <span className="text-2xl font-bold text-slate-900">{s.val}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header gap-3">
          <h3 className="section-title">Listado de Personal</h3>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input pl-9 w-60" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-wrapper">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-brand-500" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Users} title="Sin resultados" description="No se encontró personal con ese criterio." />
          ) : (
            <table className="table">
              <thead><tr>
                <th>Nombre</th><th>RUT</th><th>Cargo</th><th>Acceso App</th><th>Estado</th><th className="text-right">Acciones</th>
              </tr></thead>
              <tbody>
                {filtered.map((r: any)=>(
                  <tr key={r.id}>
                    <td><div className="font-medium text-slate-800">{r.nombre} {r.apellido}</div><div className="text-xs text-slate-400">{r.email}</div></td>
                    <td className="font-mono text-sm">{r.rut}</td>
                    <td>{r.cargo}</td>
                    <td>
                      {hasAuth[r.id] ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3"/> ACTIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <ShieldAlert className="w-3 h-3"/> SIN ACCESO
                        </span>
                      )}
                    </td>
                    <td><EstadoBadge estado={r.estado} /></td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost btn-sm p-1.5" onClick={()=>openEdit(r)}><Pencil className="w-3.5 h-3.5"/></button>
                        <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" onClick={()=>setDelId(r.id)}><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={modal !== null} onClose={()=>setModal(null)} title={modal==='add'?'Agregar Funcionario':'Editar Funcionario'} size="lg">
        <div className="p-6 grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl border border-red-200">{error}</div>}
          <F label="RUT" value={form.rut} onChange={v=>setForm({...form,rut:v})} placeholder="12.345.678-9" />
          <F label="Cargo" value={form.cargo} onChange={v=>setForm({...form,cargo:v})} select options={CARGOS} />
          <F label="Nombre" value={form.nombre} onChange={v=>setForm({...form,nombre:v})} />
          <F label="Apellido" value={form.apellido} onChange={v=>setForm({...form,apellido:v})} />
          <F label="Email" value={form.email} onChange={v=>setForm({...form,email:v})} type="email" />
          <F label="Teléfono" value={form.telefono} onChange={v=>setForm({...form,telefono:v})} placeholder="+56912345678" />
          <F label="Departamento" value={form.departamento} onChange={v=>setForm({...form,departamento:v})} select options={DPTOS} />
          <F label="Tipo Contrato" value={form.tipo_contrato} onChange={v=>setForm({...form,tipo_contrato:v})} select options={CONTRATOS} />
          <F label="Fecha Ingreso" value={form.fecha_ingreso} onChange={v=>setForm({...form,fecha_ingreso:v})} type="date" />
          <F label="Sueldo Base ($)" value={form.sueldo_base} onChange={v=>setForm({...form,sueldo_base:v})} type="number" placeholder="1500000" />
          <F label="Estado" value={form.estado} onChange={v=>setForm({...form,estado:v as EstadoGeneral})} select options={['activo','inactivo','suspendido']} />
          
          {perfil?.rol === 'super_admin' && (
            <div className="col-span-2 bg-brand-50/50 p-4 rounded-2xl border border-brand-100 mt-2">
              <h4 className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5"/> Control de Roles (Super Admin)
              </h4>
              <F 
                label="Rol de Usuario en Bloom" 
                value={form.rol} 
                onChange={v=>setForm({...form, rol: v})} 
                select 
                options={['super_admin', 'direccion', 'profesor', 'administrativo', 'apoderado']} 
              />
              <p className="text-[10px] text-slate-400 mt-2">
                **Atención**: Cambiar el rol afectará inmediatamente los permisos de acceso de este usuario.
              </p>
            </div>
          )}
          
          <div className="col-span-2 pt-4 mt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Key className="w-3.5 h-3.5"/> Credenciales de Acceso a Bloom
            </h4>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="form-group">
                <label className="label">Usuario (RUT)</label>
                <input className="input bg-white" value={form.rut} disabled />
                <p className="text-[10px] text-slate-400 mt-1">El RUT será su identificador de ingreso.</p>
              </div>
              <div className="form-group">
                <label className="label">{hasAuth[form.rut] ? 'Cambiar Contraseña' : 'Crear Contraseña'}</label>
                <input 
                  className="input bg-white" 
                  type="text" 
                  placeholder={hasAuth[form.rut] ? '••••••••' : 'Mín. 6 caracteres'} 
                  value={form.password} 
                  onChange={e=>setForm({...form, password: e.target.value})} 
                />
                <p className="text-[10px] text-brand-600 mt-1">Si dejas esto en blanco, no se creará/cambiará el acceso.</p>
              </div>
            </div>
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving?'Guardando...':'Guardar'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={()=>setDelId(null)} onConfirm={del} title="Eliminar Funcionario" message="¿Estás seguro de eliminar este funcionario? Esta acción no se puede deshacer." />

      {success && (
        <div className="fixed bottom-8 right-8 z-50 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 font-medium text-sm animate-fade-in shadow-2xl max-w-xs border-l-4 border-l-emerald-500">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p>{success}</p>
          <button className="ml-auto hover:underline text-xs" onClick={() => setSuccess('')}>Cerrar</button>
        </div>
      )}
    </div>
  )
}

function F({ label, value, onChange, type='text', placeholder='', select=false, options=[] }: { label:string; value:string; onChange:(v:string)=>void; type?:string; placeholder?:string; select?:boolean; options?:string[] }) {
  return (
    <div className="form-group">
      <label className="label">{label}</label>
      {select
        ? <select className="input" value={value} onChange={e=>onChange(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {options.map(o=><option key={o} value={o} className="capitalize">{o}</option>)}
          </select>
        : <input className="input" type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  )
}
