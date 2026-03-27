import { useEffect, useState } from 'react'
import { supabase, Comunicado, TipoComunicado } from '@/lib/supabase'
import { PageHeader, Modal, ConfirmDialog, EmptyState, Spinner } from '@/components/ui'
import { Plus, Trash2, MessageSquare, AlertCircle, Users, Globe, Pencil, History, Send, Info, Calendar, User, Mail, MessageCircle, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { ModalEnviarEmail } from '@/components/ModalEnviarEmail'
import { useMensajeriaGlobal, MensajeTarget } from '@/contexts/MensajeriaContext'
import { ComunicadoEnvio } from '@/lib/supabase'

const tipoConfig = {
  interno: { label:'Interno', icon: Users,          cls:'badge-blue',   bg:'bg-blue-50',   border:'border-blue-200',   text:'text-blue-700'  },
  padres:  { label:'Padres',  icon: MessageSquare,   cls:'badge-green',  bg:'bg-green-50',  border:'border-green-200',  text:'text-green-700' },
  general: { label:'General', icon: Globe,           cls:'badge-purple', bg:'bg-purple-50', border:'border-purple-200', text:'text-purple-700'},
}

const emptyForm = { titulo:'', contenido:'', tipo:'interno' as TipoComunicado, es_urgente:false, fecha_expiracion:'' }

export default function ComunicadosPage() {
  const { perfil, selectedEstablecimientoId }         = useAuth()
  const [rows, setRows]    = useState<Comunicado[]>([])
  const [filter, setFilter]= useState<TipoComunicado|''>('')
  const [loading, setLoading]= useState(true)
  const [modal, setModal]  = useState<'add'|'edit'|null>(null)
  const [delId, setDelId]  = useState<string|null>(null)
  const [editing, setEditing] = useState<Comunicado|null>(null)
  const [form, setForm]    = useState({ ...emptyForm })
  const [saving, setSaving]= useState(false)
  const [canalEnvio, setCanalEnvio] = useState<'none' | 'email' | 'whatsapp' | 'ambos'>('none')
  const [isReadOnly, setIsReadOnly] = useState(false)

  // Mensajería y Historial
  const [sendingComunicado, setSendingComunicado] = useState<Comunicado | null>(null)
  const [historyComunicado, setHistoryComunicado] = useState<Comunicado | null>(null)
  const [destinatarios, setDestinatarios] = useState<MensajeTarget[]>([])

  async function load() {
    if (!selectedEstablecimientoId) return
    setLoading(true)
    const { data } = await supabase
      .from('comunicados')
      .select('*, perfiles(nombre, apellido), comunicados_envios(id)')
      .eq('estado','activo')
      .eq('establecimiento_id', selectedEstablecimientoId)
      .order('es_urgente', { ascending: false })
      .order('created_at', { ascending: false })
    setRows(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [selectedEstablecimientoId])

  function openAdd() { 
    setForm({...emptyForm}); 
    setEditing(null); 
    setCanalEnvio('none'); 
    setIsReadOnly(false);
    setModal('add') 
  }
  function openEdit(r: Comunicado) {
    setForm({ titulo:r.titulo, contenido:r.contenido, tipo:r.tipo, es_urgente:r.es_urgente, fecha_expiracion:r.fecha_expiracion?.split('T')[0]??'' })
    setEditing(r); 
    setIsReadOnly(true); // Siempre abrir en modo lectura primero
    setModal('edit')
  }

  async function save() {
    if (!selectedEstablecimientoId) {
      alert('Error: No hay un establecimiento seleccionado.')
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
      establecimiento_id: selectedEstablecimientoId
    }

    const { data: newRecord, error: e } = editing
      ? await supabase.from('comunicados').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('comunicados').insert([payload]).select().single()

    setSaving(false)
    if (!e && newRecord) { 
      setModal(null)
      load() 
      if (canalEnvio !== 'none' && !editing) {
          handlePrepareSend(newRecord)
      }
    }
    else if (e) { alert(e.message) }
  }

  async function del() {
    if (!delId) return
    await supabase.from('comunicados').update({ estado: 'inactivo' }).eq('id', delId)
    setDelId(null); load()
  }

  async function handlePrepareSend(c: Comunicado) {
    if (!selectedEstablecimientoId) return
    
    let recipients: MensajeTarget[] = []

    if (c.tipo === 'interno') {
        const { data } = await supabase
            .from('personal')
            .select('nombre, apellido, email, telefono')
            .eq('establecimiento_id', selectedEstablecimientoId)
            .eq('estado', 'activo')
        
        if (data) {
            recipients = data.map(r => ({
                nombre: `${r.nombre} ${r.apellido}`,
                email: r.email ?? undefined,
                telefono: r.telefono ?? undefined
            }))
        }
    } else {
        const { data } = await supabase
            .from('apoderados')
            .select('nombre, apellido, email, telefono')
            .eq('establecimiento_id', selectedEstablecimientoId)
        
        if (data) {
            recipients = data.map(r => ({
                nombre: `${r.nombre} ${r.apellido}`,
                email: r.email ?? undefined,
                telefono: r.telefono ?? undefined
            }))
        }
    }

    setDestinatarios(recipients)
    return recipients // Return recipients to use them in save()
  }

  async function handleSendDirect(c: Comunicado, canal: 'email' | 'whatsapp' | 'ambos') {
      const targets = await handlePrepareSend(c)
      setSendingComunicado(c) // para el onSuccess callback del Modal si se usara, pero aquí lo haremos directo
      
      // Llamamos a enviarMensaje del contexto (asumimos que está disponible vía hook)
      // pero wait, enviarMensaje está dentro de useMensajeriaGlobal
      // Lo meteré en el componente principal
  }

  async function handleSaveLog(res: any) {
    if (!sendingComunicado || !perfil) return

    const totalEnviados = res.enviadosEmail + res.enviadosWhatsapp
    
    await supabase.from('comunicados_envios').insert({
        comunicado_id: sendingComunicado.id,
        enviado_por_id: perfil.id,
        metodo: res.enviadosEmail > 0 && res.enviadosWhatsapp > 0 ? 'ambos' : (res.enviadosEmail > 0 ? 'email' : 'whatsapp'),
        cantidad_personas: totalEnviados,
        detalles: {
            destinatarios_count: destinatarios.length,
            resultado: res,
            timestamp: new Date().toISOString()
        }
    })
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
          {filtered.filter(r=>r.es_urgente).map(r=><ComunicadoCard key={r.id} r={r} onEdit={openEdit} onDel={setDelId} onSend={()=>handlePrepareSend(r)} onHistory={()=>setHistoryComunicado(r)}/>)}
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
          filtered.filter(r=>!r.es_urgente).map(r=><ComunicadoCard key={r.id} r={r} onEdit={openEdit} onDel={setDelId} onSend={()=>handlePrepareSend(r)} onHistory={()=>setHistoryComunicado(r)}/>)
        )}
      </div>

      <Modal open={modal!==null} onClose={()=>setModal(null)} title={isReadOnly ? 'Detalle del Comunicado' : (modal==='add'?'Nuevo Comunicado':'Editar Comunicado')} size="lg">
        <div className="p-6 flex flex-col gap-6">
          {isReadOnly ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`${tipoConfig[form.tipo].cls} text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full`}>
                            {tipoConfig[form.tipo].label}
                        </span>
                        {form.es_urgente && (
                            <span className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Urgente
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 leading-tight">{form.titulo}</h2>
                  </div>
                  {form.fecha_expiracion && (
                      <div className="text-right flex-shrink-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Expira el</p>
                          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-sm font-semibold">{format(new Date(form.fecha_expiracion), "d 'de' MMM, yyyy", { locale: es })}</span>
                          </div>
                      </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                   <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-base italic">
                       "{form.contenido}"
                   </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <User className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Publicado por</p>
                            <p className="text-sm font-semibold text-slate-700">
                                {editing.perfiles ? `${editing.perfiles.nombre} ${editing.perfiles.apellido}` : 'Sistema'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha de publicación</p>
                        <p className="text-sm font-medium text-slate-600">
                            {format(new Date(editing.created_at), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                        </p>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-amber-600 flex-shrink-0 shadow-sm border border-amber-100">
                        <Info className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800 mb-0.5">Comunicado Protegido</p>
                        <p className="text-xs text-amber-600 leading-relaxed">Este mensaje ya fue distribuido por canales externos. Para mantener la integridad del historial y evitar confusiones, no es posible editarlo.</p>
                    </div>
                </div>
              </div>
          ) : (
              <>
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

                {modal === 'add' && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Notificar inmediatamente por:</label>
                        <div className="grid grid-cols-4 gap-2">
                            <button 
                              type="button"
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${canalEnvio === 'none' ? 'border-slate-300 bg-white text-slate-600' : 'border-transparent bg-white text-slate-400 hover:border-slate-200'}`}
                              onClick={() => setCanalEnvio('none')}
                            >
                              <X className="w-4 h-4" />
                              <span className="text-[10px] font-bold">No enviar</span>
                            </button>
                            <button 
                              type="button"
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${canalEnvio === 'email' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-transparent bg-white text-slate-400 hover:border-slate-200'}`}
                              onClick={() => setCanalEnvio('email')}
                            >
                              <Mail className="w-4 h-4" />
                              <span className="text-[10px] font-bold">Email</span>
                            </button>
                            <button 
                              type="button"
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${canalEnvio === 'whatsapp' ? 'border-[#25D366] bg-[#25D366]/10 text-[#075E54]' : 'border-transparent bg-white text-slate-400 hover:border-slate-200'}`}
                              onClick={() => setCanalEnvio('whatsapp')}
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-[10px] font-bold">WhatsApp</span>
                            </button>
                            <button 
                              type="button"
                              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${canalEnvio === 'ambos' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent bg-white text-slate-400 hover:border-slate-200'}`}
                              onClick={() => setCanalEnvio('ambos')}
                            >
                              <div className="flex -space-x-1">
                                  <Mail className="w-3.5 h-3.5" />
                                  <MessageCircle className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-bold">Ambos</span>
                            </button>
                        </div>
                    </div>
                )}
              </>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="btn-secondary" onClick={()=>setModal(null)}>{isReadOnly ? 'Cerrar' : 'Cancelar'}</button>
            {isReadOnly && editing && (editing.comunicados_envios?.length || 0) === 0 ? (
                <button className="btn-primary" onClick={() => setIsReadOnly(false)}>
                    <Pencil className="w-4 h-4 mr-2" /> Editar comunicado
                </button>
            ) : !isReadOnly && (
                <button className="btn-primary" onClick={save} disabled={saving}>
                    {saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Publicar')}
                </button>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delId} onClose={()=>setDelId(null)} onConfirm={del} title="Archivar Comunicado" message="¿Deseas archivar este comunicado? Ya no será visible." confirmLabel="Archivar" />

      {/* Modal de Envío */}
      {sendingComunicado && (
          <ModalEnviarEmail
            open={!!sendingComunicado}
            onClose={() => setSendingComunicado(null)}
            destinatarios={destinatarios}
            contexto={`comunicado: ${sendingComunicado.titulo}`}
            onSuccess={handleSaveLog}
            initialCanal={canalEnvio}
          />
      )}

      {/* Modal de Historial */}
      {historyComunicado && (
          <LogEnvioModal 
            comunicado={historyComunicado} 
            onClose={() => setHistoryComunicado(null)} 
          />
      )}
    </div>
  )
}

function ComunicadoCard({ r, onEdit, onDel, onSend, onHistory }: { r: Comunicado; onEdit:(r:Comunicado)=>void; onDel:(id:string)=>void; onSend:()=>void; onHistory:()=>void }) {
  const t = tipoConfig[r.tipo]
  const Icon = t.icon
  const sent = (r.comunicados_envios?.length || 0) > 0

  return (
    <div 
        className={`card p-0 border overflow-hidden ${r.es_urgente ? 'border-red-200 bg-red-50' : 'border-slate-200'} hover:shadow-card-hover transition-all cursor-pointer`}
        onClick={() => onEdit(r)}
    >
      <div className="flex items-stretch justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0 p-4">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${r.es_urgente ? 'bg-red-100 text-red-600' : `${t.bg} ${t.text}`}`}>
            {r.es_urgente ? <AlertCircle className="w-4 h-4"/> : <Icon className="w-4 h-4"/>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <p className="font-bold text-slate-800">{r.titulo}</p>
              {r.es_urgente && <span className="badge-red text-[9px] px-1.5 py-0.5">URGENTE</span>}
              <span className={`${t.cls} text-[9px] px-1.5 py-0.5`}>{t.label}</span>
              {sent && <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] px-1.5 py-0.5 rounded-full font-bold">ENVIADO</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{r.contenido}</p>
            <p className="text-xs text-slate-400 mt-2">
              {r.perfiles ? `${r.perfiles.nombre} ${r.perfiles.apellido} · ` : ''}
              {format(new Date(r.fecha_publicacion), "d 'de' MMMM, HH:mm", { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 px-3 bg-slate-50/50 border-l border-slate-100" onClick={e => e.stopPropagation()}>
          {sent ? (
              <>
                <button 
                  className="btn-ghost btn-sm p-2 text-slate-500 hover:bg-white hover:shadow-sm" 
                  title="Ver historial de envíos"
                  onClick={onHistory}
                >
                  <History className="w-4 h-4"/>
                </button>
              </>
          ) : (
              <>
                <button 
                  className="btn-ghost btn-sm p-2 text-slate-400 hover:text-slate-600 hover:bg-white hover:shadow-sm" 
                  onClick={() => onEdit(r)}
                  title="Editar"
                >
                  <Pencil className="w-4 h-4"/>
                </button>
              </>
          )}
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button className="btn-ghost btn-sm p-2 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={()=>onDel(r.id)} title="Archivar"><Trash2 className="w-4 h-4"/></button>
        </div>
      </div>
    </div>
  )
}

function LogEnvioModal({ comunicado, onClose }: { comunicado: Comunicado; onClose:()=>void }) {
    const [logs, setLogs] = useState<ComunicadoEnvio[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase
            .from('comunicados_envios')
            .select('*, perfiles(nombre, apellido)')
            .eq('comunicado_id', comunicado.id)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                setLogs(data || [])
                setLoading(false)
            })
    }, [comunicado.id])

    return (
        <Modal open onClose={onClose} title="Historial de Envíos" size="lg">
            <div className="p-6 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-brand-600 flex-shrink-0">
                        <Info className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">{comunicado.titulo}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1">{comunicado.contenido}</p>
                    </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex justify-center py-8"><Spinner className="w-5 h-5 text-brand-500" /></div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">No se han realizado envíos externos de este comunicado.</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            {log.perfiles?.nombre[0]}{log.perfiles?.apellido[0]}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">{log.perfiles?.nombre} {log.perfiles?.apellido}</p>
                                            <p className="text-[10px] text-slate-400">{format(new Date(log.created_at), "d 'de' MMM, HH:mm", { locale: es })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {log.metodo === 'whatsapp' || log.metodo === 'ambos' ? <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" /> : null}
                                        {log.metodo === 'email' || log.metodo === 'ambos' ? <Mail className="w-3.5 h-3.5 text-blue-500" /> : null}
                                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                                            {log.metodo === 'ambos' ? 'Email y WA' : log.metodo}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="w-3 h-3 text-slate-400" />
                                            <span className="text-xs font-semibold text-slate-600">{log.cantidad_personas} destinatarios</span>
                                        </div>
                                        {log.detalles?.resultado?.fallidosEmail > 0 || log.detalles?.resultado?.fallidosWhatsapp > 0 ? (
                                            <div className="flex items-center gap-1.5 text-amber-600">
                                                <AlertCircle className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">Algunos fallos</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-emerald-600">
                                                <Calendar className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">Completado</span>
                                            </div>
                                        )}
                                    </div>
                                    <button className="text-[10px] font-bold text-brand-600 hover:underline">Ver detalles</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button className="btn-secondary" onClick={onClose}>Cerrar</button>
                </div>
            </div>
        </Modal>
    )
}
