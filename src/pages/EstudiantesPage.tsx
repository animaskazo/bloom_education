import { useEffect, useState } from 'react'
import { supabase, Estudiante, Curso, EstadoGeneral } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Modal, ConfirmDialog, EmptyState, EstadoBadge, Spinner } from '@/components/ui'
import { Plus, Pencil, Trash2, GraduationCap, Search, Filter } from 'lucide-react'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'

const emptyForm = { rut:'', nombre:'', apellido:'', fecha_nacimiento:'', genero:'', nacionalidad:'Chilena', direccion:'', curso_id:'', estado:'activo' as EstadoGeneral }

export default function EstudiantesPage() {
  const { perfil } = useAuth()
  const [rows, setRows]       = useState<Estudiante[]>([])
  const [cursos, setCursos]   = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterCurso, setFilterCurso] = useState('')
  const [modal, setModal]     = useState<'add'|'edit'|null>(null)
  const [delId, setDelId]     = useState<string|null>(null)
  const [editing, setEditing] = useState<Estudiante|null>(null)
  const [form, setForm]       = useState({ ...emptyForm })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  async function load() {
    setLoading(true)
    const [{ data: est }, { data: cur }] = await Promise.all([
      supabase.from('estudiantes').select('*, cursos(id,nombre,nivel,letra)').order('apellido'),
      supabase.from('cursos').select('*').eq('estado','activo').order('nombre'),
    ])
    setRows(est ?? [])
    setCursos(cur ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd()  { setForm({...emptyForm}); setEditing(null); setError(''); setModal('add') }
  function openEdit(r: any) {
    setForm({ rut:r.rut, nombre:r.nombre, apellido:r.apellido, fecha_nacimiento:r.fecha_nacimiento??'', genero:r.genero??'', nacionalidad:r.nacionalidad??'Chilena', direccion:r.direccion??'', curso_id:r.curso_id??'', estado:r.estado })
    setEditing(r); setError(''); setModal('edit')
  }

  async function save() {
    if (!perfil?.establecimiento_id) {
      setError('No tienes un establecimiento asignado.')
      return
    }

    setSaving(true); setError('')
    const payload = { 
      rut: form.rut, 
      nombre: form.nombre, 
      apellido: form.apellido, 
      fecha_nacimiento: form.fecha_nacimiento||null, 
      genero: form.genero||null, 
      nacionalidad: form.nacionalidad||null, 
      direccion: form.direccion||null, 
      curso_id: form.curso_id||null, 
      estado: form.estado,
      establecimiento_id: perfil.establecimiento_id
    }

    const { error: e } = editing
      ? await supabase.from('estudiantes').update(payload).eq('id', editing.id)
      : await supabase.from('estudiantes').insert([payload])

    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false); setModal(null); load()
  }

  async function del() {
    if (!delId) return
    await supabase.from('estudiantes').delete().eq('id', delId)
    setDelId(null); load()
  }

  const filtered = rows.filter(r => {
    const q = `${r.nombre} ${r.apellido} ${r.rut}`.toLowerCase().includes(search.toLowerCase())
    const c = filterCurso ? r.curso_id === filterCurso : true
    return q && c
  })

  const cursoName = (r: any) => r.cursos ? `${r.cursos.nombre}${r.cursos.letra?' '+r.cursos.letra:''}` : '—'
  const edad = (d?: string|null) => d ? `${differenceInYears(new Date(), new Date(d))} años` : '—'

  const nivelColors: Record<string,string> = { pre_basica:'badge-purple', basica:'badge-blue', media:'badge-green' }
  const nivelLabel: Record<string,string> = { pre_basica:'Pre-básica', basica:'Básica', media:'Media' }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Gestión de Estudiantes"
        subtitle={`${rows.filter(r=>r.estado==='activo').length} estudiantes matriculados`}
        action={<button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4"/>Agregar estudiante</button>}
      />

      {/* Stats por nivel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Total', val:rows.length, cls:'bg-slate-100 text-slate-700' },
          { label:'Pre-básica', val:rows.filter(r=>r.cursos?.nivel==='pre_basica').length, cls:'bg-purple-50 text-purple-700' },
          { label:'Básica', val:rows.filter(r=>r.cursos?.nivel==='basica').length, cls:'bg-blue-50 text-blue-700' },
          { label:'Media', val:rows.filter(r=>r.cursos?.nivel==='media').length, cls:'bg-green-50 text-green-700' },
        ].map(s=>(
          <div key={s.label} className="card p-4 flex flex-col gap-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full self-start ${s.cls}`}>{s.label}</span>
            <span className="text-2xl font-bold text-slate-900">{s.val}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header flex-wrap gap-2">
          <h3 className="section-title">Listado de Estudiantes</h3>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className="input pl-9 w-52" placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select className="input pl-9 w-44" value={filterCurso} onChange={e=>setFilterCurso(e.target.value)}>
                <option value="">Todos los cursos</option>
                {cursos.map(c=><option key={c.id} value={c.id}>{c.nombre}{c.letra?' '+c.letra:''}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="table-wrapper">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-brand-500" /></div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={GraduationCap} title="Sin estudiantes" description="No hay estudiantes que coincidan." action={<button className="btn-primary btn-sm" onClick={openAdd}><Plus className="w-3.5 h-3.5"/>Agregar</button>} />
          ) : (
            <table className="table">
              <thead><tr><th>Nombre</th><th>RUT</th><th>Edad</th><th>Curso</th><th>Nivel</th><th>Estado</th><th className="text-right">Acciones</th></tr></thead>
              <tbody>
                {filtered.map((r: any)=>(
                  <tr key={r.id}>
                    <td><div className="font-medium text-slate-800">{r.nombre} {r.apellido}</div><div className="text-xs text-slate-400">{r.genero==='F'?'Femenino':r.genero==='M'?'Masculino':'—'}</div></td>
                    <td className="font-mono text-sm">{r.rut}</td>
                    <td>{edad(r.fecha_nacimiento)}</td>
                    <td>{cursoName(r)}</td>
                    <td>{r.cursos ? <span className={nivelColors[r.cursos.nivel]}>{nivelLabel[r.cursos.nivel]}</span> : '—'}</td>
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

      <Modal open={modal!==null} onClose={()=>setModal(null)} title={modal==='add'?'Agregar Estudiante':'Editar Estudiante'} size="lg">
        <div className="p-6 grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 bg-red-50 text-red-700 text-sm px-3 py-2 rounded-xl border border-red-200">{error}</div>}
          <F label="RUT" value={form.rut} onChange={v=>setForm({...form,rut:v})} placeholder="20.111.222-3" />
          <F label="Género" value={form.genero} onChange={v=>setForm({...form,genero:v})} select options={[['F','Femenino'],['M','Masculino'],['otro','Otro']]} />
          <F label="Nombre" value={form.nombre} onChange={v=>setForm({...form,nombre:v})} />
          <F label="Apellido" value={form.apellido} onChange={v=>setForm({...form,apellido:v})} />
          <F label="Fecha de Nacimiento" value={form.fecha_nacimiento} onChange={v=>setForm({...form,fecha_nacimiento:v})} type="date" />
          <F label="Nacionalidad" value={form.nacionalidad} onChange={v=>setForm({...form,nacionalidad:v})} />
          <div className="form-group col-span-2">
            <label className="label">Dirección</label>
            <input className="input" value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})} placeholder="Calle, número, comuna" />
          </div>
          <div className="form-group">
            <label className="label">Curso</label>
            <select className="input" value={form.curso_id} onChange={e=>setForm({...form,curso_id:e.target.value})}>
              <option value="">— Sin asignar —</option>
              {cursos.map(c=><option key={c.id} value={c.id}>{c.nombre}{c.letra?' '+c.letra:''}</option>)}
            </select>
          </div>
          <F label="Estado" value={form.estado} onChange={v=>setForm({...form,estado:v as EstadoGeneral})} select options={[['activo','Activo'],['inactivo','Inactivo'],['suspendido','Suspendido']]} />
          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving?'Guardando...':'Guardar'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={()=>setDelId(null)} onConfirm={del} title="Eliminar Estudiante" message="¿Estás seguro de eliminar este estudiante? Se perderán todos sus datos asociados." />
    </div>
  )
}

function F({ label, value, onChange, type='text', placeholder='', select=false, options=[] as string[]|[string,string][] }) {
  return (
    <div className="form-group">
      <label className="label">{label}</label>
      {select
        ? <select className="input" value={value} onChange={e=>onChange(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {options.map(o => Array.isArray(o)
              ? <option key={o[0]} value={o[0]}>{o[1]}</option>
              : <option key={o} value={o}>{o}</option>
            )}
          </select>
        : <input className="input" type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  )
}
