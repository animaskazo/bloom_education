import { useEffect, useState } from 'react'
import { supabase, Comunicado, TipoComunicado } from '@/lib/supabase'
import { PageHeader, Modal, ConfirmDialog, EmptyState, Spinner } from '@/components/ui'
import { Plus, Trash2, MessageSquare, AlertCircle, Users, Globe, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'

const tipoConfig = {
  interno: { label:'Interno', icon: Users,          cls:'badge-blue',   bg:'bg-blue-50',   border:'border-blue-200',   text:'text-blue-700'  },
  padres:  { label:'Padres',  icon: MessageSquare,   cls:'badge-green',  bg:'bg-green-50',  border:'border-green-200',  text:'text-green-700' },
  general: { label:'General', icon: Globe,           cls:'badge-purple', bg:'bg-purple-50', border:'border-purple-200', text:'text-purple-700'},
}

const emptyForm = { titulo:'', contenido:'', tipo:'interno' as TipoComunicado, es_urgente:false, fecha_expiracion:'' }

export default function ComunicadosPage() {
  const { perfil }         = useAuth()
  const [rows, setRows]    = useState<Comunicado[]>([])
  const [filter, setFilter]= useState<TipoComunicado|''>('')
  const [loading, setLoading]= useState(true)
  const [modal, setModal]  = useState<'add'|'edit'|null>(null)
  const [delId, setDelId]  = useState<string|null>(null)
  const [editing, setEditing] = useState<Comunicado|null>(null)
  const [form, setForm]    = useState({ ...emptyForm })
  const [saving, setSaving]= useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('comunicados')
      .select('*, perfiles(nombre, apellido)')
      .eq('estado','activo')
      .order('es_urgente', { ascending: false })
      .order('created_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd() { setForm({...emptyForm}); setEditing(null); setModal('add') }
  function openEdit(r: Comunicado) {
    setForm({ titulo:r.titulo, contenido:r.contenido, tipo:r.tipo, es_urgente:r.es_urgente, fecha_expiracion:r.fecha_expiracion?.split('T')[0]??'' })
    setEditing(r); setModal('edit')
  }

  async function save() {
    if (!perfil?.establecimiento_id) {
      alert('Error: No tienes un establecimiento asignado.')
      return
    }

    setSaving(true)
    const payload = { 
      titulo: form.titulo, 
      contenido: form.contenido, 
      tipo: form.tipo, 
      es_urgente: form.es_urgente, 
      fecha_expiracion: form.fecha_expiracion||null, 
      autor_id: perfil?.id||null, 
      estado: 'activo' as const,
      establecimiento_id: perfil.establecimiento_id
    }

    const { error: e } = editing
      ? await supabase.from('comunicados').update(payload).eq('id', editing.id)
      : await supabase.from('comunicados').insert([payload]) // Use array for consistency

    setSaving(false)
    if (!e) { setModal(null); load() }
    else { alert(e.message) }
  }

  async function del() {
    if (!delId) return
    await supabase.from('comunicados').update({ estado: 'inactivo' }).eq('id', delId)
    setDelId(null); load()
  }

  const filtered = filter ? rows.filter(r=>r.tipo===filter) : rows

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Comunicados"
        subtitle="Gestión de comunicación interna y con padres"
        action={<button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4"/>Nuevo comunicado</button>}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {([['','Todos']] as [string,string][]).concat(Object.entries(tipoConfig).map(([k,v])=>[k,v.label])).map(([val,label])=>(
          <button
            key={val}
            onClick={()=>setFilter(val as any)}
            className={`btn btn-sm ${filter===val ? 'btn-primary' : 'btn-secondary'}`}
          >{label}</button>
        ))}
      </div>

      {/* Urgentes primero */}
      {filtered.some(r=>r.es_urgente) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/>Urgentes</p>
          {filtered.filter(r=>r.es_urgente).map(r=><ComunicadoCard key={r.id} r={r} onEdit={openEdit} onDel={setDelId}/>)}
        </div>
      )}

      {/* Resto */}
      <div className="space-y-2">
        {!filtered.some(r=>r.es_urgente) && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comunicados</p>}
        {filtered.some(r=>!r.es_urgente) && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recientes</p>}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="w-6 h-6 text-brand-500"/></div>
        ) : filtered.filter(r=>!r.es_urgente).length === 0 && !filtered.some(r=>r.es_urgente) ? (
          <EmptyState icon={MessageSquare} title="Sin comunicados" description="No hay comunicados publicados." action={<button className="btn-primary btn-sm" onClick={openAdd}><Plus className="w-3.5 h-3.5"/>Crear comunicado</button>} />
        ) : (
          filtered.filter(r=>!r.es_urgente).map(r=><ComunicadoCard key={r.id} r={r} onEdit={openEdit} onDel={setDelId}/>)
        )}
      </div>

      {/* Modal */}
      <Modal open={modal!==null} onClose={()=>setModal(null)} title={modal==='add'?'Nuevo Comunicado':'Editar Comunicado'} size="lg">
        <div className="p-6 flex flex-col gap-4">
          <div className="form-group">
            <label className="label">Título</label>
            <input className="input" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Título del comunicado" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Tipo de Comunicado</label>
              <select className="input" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value as TipoComunicado})}>
                <option value="interno">Interno (solo staff)</option>
                <option value="padres">Para Padres y Apoderados</option>
                <option value="general">General</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Fecha de Expiración</label>
              <input className="input" type="date" value={form.fecha_expiracion} onChange={e=>setForm({...form,fecha_expiracion:e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Contenido</label>
            <textarea className="input resize-none" rows={6} value={form.contenido} onChange={e=>setForm({...form,contenido:e.target.value})} placeholder="Escribe el contenido del comunicado..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.es_urgente} onChange={e=>setForm({...form,es_urgente:e.target.checked})} className="w-4 h-4 rounded accent-red-500" />
            <span className="text-sm font-medium text-slate-700">Marcar como urgente</span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving?'Publicando...':'Publicar'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={()=>setDelId(null)} onConfirm={del} title="Archivar Comunicado" message="¿Deseas archivar este comunicado? Ya no será visible." confirmLabel="Archivar" />
    </div>
  )
}

function ComunicadoCard({ r, onEdit, onDel }: { r: Comunicado; onEdit:(r:Comunicado)=>void; onDel:(id:string)=>void }) {
  const t = tipoConfig[r.tipo]
  const Icon = t.icon
  return (
    <div className={`card p-4 border ${r.es_urgente ? 'border-red-200 bg-red-50' : 'border-slate-200'} hover:shadow-card-hover transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${r.es_urgente ? 'bg-red-100 text-red-600' : `${t.bg} ${t.text}`}`}>
            {r.es_urgente ? <AlertCircle className="w-4 h-4"/> : <Icon className="w-4 h-4"/>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-800">{r.titulo}</p>
              {r.es_urgente && <span className="badge-red text-[10px]">URGENTE</span>}
              <span className={t.cls}>{t.label}</span>
            </div>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{r.contenido}</p>
            <p className="text-xs text-slate-400 mt-2">
              {r.perfiles ? `${r.perfiles.nombre} ${r.perfiles.apellido} · ` : ''}
              {format(new Date(r.fecha_publicacion), "d 'de' MMMM, HH:mm", { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button className="btn-ghost btn-sm p-1.5" onClick={()=>onEdit(r)}><Pencil className="w-3.5 h-3.5"/></button>
          <button className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50" onClick={()=>onDel(r.id)}><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      </div>
    </div>
  )
}
