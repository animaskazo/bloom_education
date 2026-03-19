import { useEffect, useState } from 'react'
import { supabase, Estudiante, Curso, EstadoGeneral } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader, Modal, ConfirmDialog, EmptyState, EstadoBadge, Spinner } from '@/components/ui'
import { Plus, Pencil, Trash2, GraduationCap, Search, Filter, ChevronDown, ChevronRight, User, FileText, Heart, Activity, Phone, Shield } from 'lucide-react'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'

const emptyForm = { 
  rut:'', nombre:'', apellido:'', fecha_nacimiento:'', genero:'', nacionalidad:'Chilena', direccion:'', curso_id:'', estado:'activo' as EstadoGeneral,
  grupo_sangre:'', alergias:'', enfermedades_cronicas:'', medicamentos:'', prevision_salud:'',
  contacto_emergencia_nombre:'', contacto_emergencia_telefono:''
}

export default function EstudiantesPage() {
  const { perfil } = useAuth()
  const canEdit = perfil?.rol === 'super_admin' || perfil?.rol === 'direccion' || perfil?.rol === 'administrativo'
  const [rows, setRows]       = useState<Estudiante[]>([])
  const [cursos, setCursos]   = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterCurso, setFilterCurso] = useState('')
  const [modal, setModal]     = useState<'add'|'edit'|'ficha'|null>(null)
  const [activeTab, setActiveTab] = useState<'personal'|'medica'|'emergencia'>('personal')
  const [delId, setDelId]     = useState<string|null>(null)
  const [editing, setEditing] = useState<Estudiante|null>(null)
  const [form, setForm]       = useState({ ...emptyForm })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [expandedCursos, setExpandedCursos] = useState<string[]>([])

  const toggleCurso = (id: string) => {
    setExpandedCursos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function load() {
    setLoading(true)
    const [{ data: est }, { data: cur }] = await Promise.all([
      supabase.from('estudiantes').select('*, cursos(id,nombre,nivel,letra)').order('apellido'),
      supabase.from('cursos').select('*').eq('estado','activo').order('nombre'),
    ])
    setRows(est ?? [])
    setCursos(cur ?? [])
    // Expand only the first course by default
    if (cur && cur.length > 0) setExpandedCursos([cur[0].id])
    else setExpandedCursos(['unassigned'])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd()  { setForm({...emptyForm}); setEditing(null); setError(''); setModal('add'); setActiveTab('personal') }
  function openEdit(r: any) {
    setForm({ 
      rut:r.rut, nombre:r.nombre, apellido:r.apellido, fecha_nacimiento:r.fecha_nacimiento??'', genero:r.genero??'', nacionalidad:r.nacionalidad??'Chilena', direccion:r.direccion??'', curso_id:r.curso_id??'', estado:r.estado,
      grupo_sangre:r.grupo_sangre??'', alergias:r.alergias??'', enfermedades_cronicas:r.enfermedades_cronicas??'', medicamentos:r.medicamentos??'', prevision_salud:r.prevision_salud??'',
      contacto_emergencia_nombre:r.contacto_emergencia_nombre??'', contacto_emergencia_telefono:r.contacto_emergencia_telefono??''
    })
    setEditing(r); setError(''); setModal('edit'); setActiveTab('personal')
  }

  function openFicha(r: any) {
    setEditing(r); setModal('ficha'); setActiveTab('personal')
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
      grupo_sangre: form.grupo_sangre||null,
      alergias: form.alergias||null,
      enfermedades_cronicas: form.enfermedades_cronicas||null,
      medicamentos: form.medicamentos||null,
      prevision_salud: form.prevision_salud||null,
      contacto_emergencia_nombre: form.contacto_emergencia_nombre||null,
      contacto_emergencia_telefono: form.contacto_emergencia_telefono||null,
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
        action={canEdit && <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4"/>Agregar estudiante</button>}
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

      <div className="space-y-4">
        {loading ? (
          <div className="card py-12 flex justify-center"><Spinner className="w-6 h-6 text-brand-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState icon={GraduationCap} title="Sin estudiantes" description="No hay estudiantes que coincidan con la búsqueda." action={<button className="btn-primary btn-sm" onClick={openAdd}><Plus className="w-3.5 h-3.5"/>Agregar</button>} />
          </div>
        ) : (
          (() => {
            const grouped: Record<string, any> = { unassigned: { nombre: 'Sin Curso Asignado', estudiantes: [] } }
            cursos.forEach(c => { grouped[c.id] = { ...c, estudiantes: [] } })
            filtered.forEach(r => {
              const key = r.curso_id || 'unassigned'
              if (grouped[key]) grouped[key].estudiantes.push(r)
              else {
                // If course is inactive but student is linked
                if (!grouped[r.curso_id]) grouped[r.curso_id] = { nombre: r.cursos?.nombre || 'Curso Desconocido', estudiantes: [r] }
                else grouped[r.curso_id].estudiantes.push(r)
              }
            })

            return Object.entries(grouped)
              .filter(([_, data]) => data.estudiantes.length > 0)
              .map(([id, data]) => (
              <div key={id} className="card overflow-hidden border-slate-100 hover:border-slate-200 transition-all shadow-sm">
                <div 
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${expandedCursos.includes(id) ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}
                  onClick={() => toggleCurso(id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-brand-500 rounded-full" />
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">{data.nombre}{data.letra ? ` ${data.letra}` : ''}</h4>
                    <span className="text-[10px] bg-white text-slate-500 px-2 py-0.5 rounded-full font-bold shadow-sm">
                      {data.estudiantes.length} Alumnos
                    </span>
                  </div>
                  {expandedCursos.includes(id) ? (
                    <ChevronDown className="w-5 h-5 text-slate-300"/>
                  ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase transition-all opacity-0 group-hover:opacity-100 mr-1">Expandir</span>
                        <ChevronRight className="w-5 h-5 text-slate-300"/>
                    </div>
                  )}
                </div>

                {expandedCursos.includes(id) && (
                  <div className="table-wrapper border-t border-slate-50 animate-fade-in">
                    <table className="table">
                      <thead><tr><th>Nombre</th><th>RUT</th><th>Edad</th><th>Nivel</th><th>Estado</th><th className="text-right">Acciones</th></tr></thead>
                      <tbody>
                        {data.estudiantes.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                            <td>
                              <div className="font-medium text-slate-800">{r.nombre} {r.apellido}</div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                                {r.genero === 'F' ? 'Femenino' : r.genero === 'M' ? 'Masculino' : '—'}
                              </div>
                            </td>
                            <td className="font-mono text-sm text-slate-500">{r.rut}</td>
                            <td className="text-sm">{edad(r.fecha_nacimiento)}</td>
                            <td>
                              {r.cursos ? <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${nivelColors[r.cursos.nivel]}`}>{nivelLabel[r.cursos.nivel]}</span> : <span className="text-slate-300">—</span>}
                            </td>
                            <td><EstadoBadge estado={r.estado} /></td>
                             <td>
                              <div className="flex justify-end gap-1">
                                <button className="btn-ghost btn-sm p-1.5 hover:bg-white text-brand-500" title="Ver Ficha" onClick={() => openFicha(r)}><FileText className="w-3.5 h-3.5"/></button>
                                {canEdit && (
                                  <>
                                    <button className="btn-ghost btn-sm p-1.5 hover:bg-white" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5"/></button>
                                    <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" onClick={() => setDelId(r.id)}><Trash2 className="w-3.5 h-3.5"/></button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          })()
        )}
      </div>

      <Modal open={modal!==null && modal!=='ficha'} onClose={()=>setModal(null)} title={modal==='add'?'Agregar Estudiante':'Editar Estudiante'} size="lg">
        <div className="border-b border-slate-100 flex px-6 overflow-x-auto no-scrollbar">
          {[
            { id: 'personal', label: 'Personal', icon: User },
            { id: 'medica', label: 'Médica', icon: Heart },
            { id: 'emergencia', label: 'Emergencia', icon: Phone }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'personal' && (
          <div className="p-6 grid grid-cols-2 gap-4 animate-fade-in">
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
          </div>
        )}

        {activeTab === 'medica' && (
          <div className="p-6 grid grid-cols-2 gap-4 animate-fade-in">
            <F label="Grupo Sanguíneo" value={form.grupo_sangre} onChange={v=>setForm({...form,grupo_sangre:v})} placeholder="Ej: A Rh+" />
            <F label="Previsión / Seguro" value={form.prevision_salud} onChange={v=>setForm({...form,prevision_salud:v})} placeholder="Ej: Fonasa, Isapre Colmena..." />
            <div className="form-group col-span-2">
              <label className="label">Alergias</label>
              <textarea className="input min-h-[80px]" value={form.alergias} onChange={e=>setForm({...form,alergias:e.target.value})} placeholder="Indicar alergias alimentarias, medicamentosas u otras..." />
            </div>
            <div className="form-group col-span-2">
              <label className="label">Enfermedades Crónicas</label>
              <textarea className="input min-h-[80px]" value={form.enfermedades_cronicas} onChange={e=>setForm({...form,enfermedades_cronicas:e.target.value})} placeholder="Asma, diabetes, epilepsia, etc." />
            </div>
            <div className="form-group col-span-2">
              <label className="label">Medicamentos en Uso</label>
              <textarea className="input min-h-[80px]" value={form.medicamentos} onChange={e=>setForm({...form,medicamentos:e.target.value})} placeholder="Indicar dosis y horarios si requiere administración en el colegio..." />
            </div>
          </div>
        )}

        {activeTab === 'emergencia' && (
          <div className="p-6 grid grid-cols-2 gap-4 animate-fade-in">
            <div className="col-span-2 bg-amber-50 rounded-xl p-3 flex gap-3 border border-amber-100">
               <Phone className="w-5 h-5 text-amber-600 shrink-0" />
               <div className="text-xs text-amber-800 leading-relaxed">
                 Esta información se utilizará exclusivamente en caso de emergencia para contactar a un responsable si los padres no están disponibles.
               </div>
            </div>
            <F label="Nombre de Contacto" value={form.contacto_emergencia_nombre} onChange={v=>setForm({...form,contacto_emergencia_nombre:v})} placeholder="Ej: Abuela, Tío..." />
            <F label="Teléfono de Emergencia" value={form.contacto_emergencia_telefono} onChange={v=>setForm({...form,contacto_emergencia_telefono:v})} placeholder="+56 9 ..." />
          </div>
        )}

        <div className="p-6 flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button className="btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
          {canEdit && <button className="btn-primary" onClick={save} disabled={saving}>{saving?'Guardando...':'Guardar Estudiante'}</button>}
        </div>
      </Modal>

      {/* MODAL FICHA (LECTURA) */}
      <Modal open={modal==='ficha'} onClose={()=>setModal(null)} title="Ficha del Estudiante" size="lg">
        {editing && (
          <div className="p-0 flex flex-col md:flex-row h-full">
            {/* Sidebar Profile */}
            <div className="w-full md:w-64 bg-slate-50 p-6 border-r border-slate-100 flex flex-col items-center">
               <div className="w-24 h-24 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-slate-200 mb-4">
                  <User className="w-12 h-12 text-slate-300" />
               </div>
               <h3 className="font-bold text-slate-900 text-center">{editing.nombre} {editing.apellido}</h3>
               <span className="text-xs text-slate-500 font-mono mb-6">{editing.rut}</span>
               
               <div className="w-full space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Curso</span>
                    <span className="text-xs font-medium text-slate-700">{cursoName(editing)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Estado</span>
                    <EstadoBadge estado={editing.estado} />
                  </div>
               </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              <div className="border-b border-slate-100 flex px-6 overflow-x-auto no-scrollbar">
                {[
                  { id: 'personal', label: 'Datos Personales', icon: User },
                  { id: 'medica', label: 'Ficha Médica', icon: Heart },
                  { id: 'emergencia', label: 'Emergencia', icon: Phone }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center gap-2 py-4 px-4 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-8 h-[400px] overflow-y-auto">
                {activeTab === 'personal' && (
                  <div className="grid grid-cols-2 gap-8 animate-fade-in">
                    <I label="RUT" val={editing.rut || '—'} />
                    <I label="Edad / Nacimiento" val={`${edad(editing.fecha_nacimiento)} (${format(new Date(editing.fecha_nacimiento||''), 'dd MMM yyyy', {locale:es})})`} />
                    <I label="Género" val={editing.genero==='F'?'Femenino':editing.genero==='M'?'Masculino':'Otros'} />
                    <I label="Nacionalidad" val={editing.nacionalidad || 'Chilena'} />
                    <I label="Dirección" val={editing.direccion || '—'} colSpan />
                  </div>
                )}
                {activeTab === 'medica' && (
                  <div className="grid grid-cols-2 gap-8 animate-fade-in">
                    <I label="Grupo Sanguíneo" val={editing.grupo_sangre || 'No informado'} icon={Activity} />
                    <I label="Previsión / Seguro" val={editing.prevision_salud || 'Sin previsión'} icon={Shield} />
                    <I label="Alergias" val={editing.alergias || 'Sin alergias conocidas'} colSpan />
                    <I label="Enfermedades Crónicas" val={editing.enfermedades_cronicas || 'Ninguna'} colSpan />
                    <I label="Medicamentos" val={editing.medicamentos || 'No registra'} colSpan />
                  </div>
                )}
                {activeTab === 'emergencia' && (
                  <div className="grid grid-cols-2 gap-8 animate-fade-in">
                    <I label="Contacto de Emergencia" val={editing.contacto_emergencia_nombre || 'No registrado'} />
                    <I label="Teléfono de Emergencia" val={editing.contacto_emergencia_telefono || '—'} icon={Phone} />
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                 <button className="btn-secondary btn-sm" onClick={()=>setModal(null)}>Cerrar</button>
                 {canEdit && (
                   <button className="btn-primary btn-sm" onClick={() => openEdit(editing)}>
                     <Pencil className="w-3.5 h-3.5 mr-2" /> Editar Ficha
                   </button>
                 )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delId} onClose={()=>setDelId(null)} onConfirm={del} title="Eliminar Estudiante" message="¿Estás seguro de eliminar este estudiante? Se perderán todos sus datos asociados." />
    </div>
  )
}

function I({ label, val, icon: Icon, colSpan=false }: { label:string, val:string, icon?:any, colSpan?:boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${colSpan ? 'col-span-2' : ''}`}>
      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-slate-300" />}
        <span className="text-sm font-medium text-slate-900 leading-relaxed">{val}</span>
      </div>
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
