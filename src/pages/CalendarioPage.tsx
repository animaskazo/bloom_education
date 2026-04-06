import { useState, useEffect } from 'react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  eachDayOfInterval,
  parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  ShieldCheck,
  Globe,
  Mail,
  MessageCircle,
  Send,
  X,
  Info
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Modal, PageHeader } from '@/components/ui'
import { ModalEnviarEmail } from '@/components/ModalEnviarEmail'
import { MensajeTarget, CanalMensaje } from '@/contexts/MensajeriaContext'

interface Evento {
  id: string
  titulo: string
  descripcion: string
  fecha: string
  hora_inicio: string | null
  tipo: string
  destinatarios: 'todos' | 'staff' | 'apoderados'
  establecimiento_id: string
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

export default function CalendarioPage() {
  const { perfil } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  // Event state
  const [formEvento, setFormEvento] = useState<Partial<Evento>>({
    titulo: '',
    descripcion: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    hora_inicio: '',
    tipo: 'actividad',
    destinatarios: 'todos'
  })

  // Messaging sub-flow
  const [canalEnvio, setCanalEnvio] = useState<CanalMensaje | 'none'>('none')
  const [emailModal, setEmailModal] = useState<{ destinatarios: MensajeTarget[]; contexto: string; initialAsunto: string; initialMensaje: string } | null>(null)

  const canEdit = perfil?.rol === 'direccion' || perfil?.rol === 'administrativo' || perfil?.rol === 'super_admin'

  useEffect(() => {
    if (perfil) fetchEventos()
  }, [currentMonth, perfil])

  async function fetchEventos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('eventos_calendario')
      .select('*')
      .gte('fecha', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
      .lte('fecha', format(endOfMonth(currentMonth), 'yyyy-MM-dd'))
      .eq('establecimiento_id', perfil?.establecimiento_id)
      .order('hora_inicio', { ascending: true })

    if (error) console.error(error)
    else setEventos(data || [])
    setLoading(false)
  }

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const openCreateModal = () => {
    if (!canEdit) return
    setModalMode('create')
    setFormEvento({
      titulo: '', descripcion: '',
      fecha: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      hora_inicio: '', tipo: 'actividad', destinatarios: 'todos'
    })
    setCanalEnvio('none')
    setIsModalOpen(true)
  }

  const openEditModal = (evento: Evento) => {
    if (!canEdit) return
    setModalMode('edit')
    setFormEvento(evento)
    setCanalEnvio('none')
    setIsModalOpen(true)
  }

  async function handleSaveEvento(e: React.FormEvent) {
    e.preventDefault()
    if (!perfil?.establecimiento_id) return

    setLoading(true)
    const payload = { ...formEvento, establecimiento_id: perfil.establecimiento_id, creado_por: perfil.id }

    const { data: savedEvent, error } = modalMode === 'create'
      ? await supabase.from('eventos_calendario').insert(payload).select().single()
      : await supabase.from('eventos_calendario').update(formEvento).eq('id', formEvento.id).select().single()

    setLoading(false)
    if (error) {
      alert('Error al guardar: ' + error.message)
      return
    }

    setIsModalOpen(false)
    fetchEventos()

    // Si se eligió notificar, preparamos el segundo modal (ModalEnviarEmail)
    if (canalEnvio !== 'none' && savedEvent) {
      prepareNotification(savedEvent)
    }
  }

  async function prepareNotification(event: Evento) {
    let recipients: MensajeTarget[] = []

    if (event.destinatarios === 'staff' || event.destinatarios === 'todos') {
      const { data } = await supabase.from('personal').select('nombre, apellido, email, telefono').eq('establecimiento_id', perfil?.establecimiento_id)
      if (data) recipients = [...recipients, ...data.map(r => ({ nombre: `${r.nombre} ${r.apellido}`, email: r.email ?? undefined, telefono: r.telefono ?? undefined }))]
    }
    if (event.destinatarios === 'apoderados' || event.destinatarios === 'todos') {
      const { data } = await supabase.from('apoderados').select('nombre, apellido, email, telefono').eq('establecimiento_id', perfil?.establecimiento_id)
      if (data) recipients = [...recipients, ...data.map(r => ({ nombre: `${r.nombre} ${r.apellido}`, email: r.email ?? undefined, telefono: r.telefono ?? undefined }))]
    }

    setEmailModal({
      destinatarios: recipients.filter((v, i, a) => a.findIndex(t => t.email === v.email || t.telefono === v.telefono) === i),
      contexto: `actividad: ${event.titulo}`,
      initialAsunto: `Nueva actividad: ${event.titulo}`,
      initialMensaje: `${event.titulo}\n\nFecha: ${format(parseISO(event.fecha), "eeee d 'de' MMMM", { locale: es })}\nDescripción: ${event.descripcion}`
    })
  }

  async function handleDeleteEvento() {
    if (!formEvento.id || !confirm('¿Estás seguro?')) return
    await supabase.from('eventos_calendario').delete().eq('id', formEvento.id)
    setIsModalOpen(false)
    fetchEventos()
  }

  return (
    <div className="container-page animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <PageHeader
          title={format(currentMonth, 'MMMM yyyy', { locale: es }).toUpperCase()}
          subtitle="Calendario de Actividades"
        />
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-4 text-xs font-bold text-slate-600 hover:text-brand-600 border-x border-slate-100">Hoy</button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
          </div>
          {canEdit && (
            <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Agendar
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        <div className="flex-1">
          <div className="grid grid-cols-7 border-t border-l border-slate-100 rounded-3xl overflow-hidden shadow-xl bg-white">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="bg-slate-50/50 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-b border-slate-100">{d}</div>
            ))}
            {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentMonth)), end: endOfWeek(endOfMonth(currentMonth)) }).map((day, idx) => {
              const dayEventos = eventos.filter(e => isSameDay(parseISO(e.fecha), day))
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isToday = isSameDay(day, new Date())
              const isSelected = selectedDate && isSameDay(day, selectedDate)

              return (
                <div key={idx} onClick={() => setSelectedDate(day)}
                  className={`min-h-[140px] p-2 border-r border-b border-slate-100 transition-all cursor-pointer group relative
                    ${!isCurrentMonth ? 'bg-slate-50/30 text-slate-300' : 'text-slate-700 hover:bg-brand-50/30'}
                    ${isSelected ? 'bg-brand-50/50' : ''}
                  `}
                >
                  <span className={`text-[16px] font-semibold w-8 h-8 flex items-center justify-center rounded-lg mb-1
                    ${isToday ? 'bg-brand-600 text-white shadow-lg' : ''}
                    ${isSelected && !isToday ? 'border border-brand-200 text-brand-600' : ''}
                  `}>{format(day, 'd')}</span>
                  <div className="space-y-1">
                    {dayEventos.slice(0, 3).map(e => (
                      <button key={e.id} onClick={(ev) => { ev.stopPropagation(); openEditModal(e); }}
                        className={`w-full text-left p-1.5 rounded-lg text-[9px] font-bold border truncate
                          ${e.destinatarios === 'staff' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' :
                            e.destinatarios === 'apoderados' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-white border-slate-100'}
                        `}
                      >{e.titulo}</button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="w-full xl:w-96 space-y-6">
          <div className="card p-8 bg-slate-900 text-white rounded-[32px] shadow-2xl relative overflow-hidden group min-h-[400px]">
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-1 text-brand-400 capitalize">
                {selectedDate ? format(selectedDate, "eeee d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
              </h3>
              <div className="w-8 h-1 bg-brand-500 rounded-full mb-8" />
              <div className="space-y-4">
                {selectedDate && eventos.filter(e => isSameDay(parseISO(e.fecha), selectedDate)).map(e => (
                  <div key={e.id} onClick={() => openEditModal(e)} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[8px] font-black uppercase bg-white/10 px-2 py-0.5 rounded-full">{e.destinatarios}</span>
                      {e.hora_inicio && <span className="text-[10px] text-slate-400">{e.hora_inicio.substring(0, 5)}</span>}
                    </div>
                    <h4 className="font-bold text-sm uppercase">{e.titulo}</h4>
                  </div>
                ))}
                {selectedDate && eventos.filter(e => isSameDay(parseISO(e.fecha), selectedDate)).length === 0 && (
                  <p className="text-center text-slate-500 text-sm italic py-12">No hay actividades</p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Legend color="bg-emerald-500" label="Global" />
            <Legend color="bg-indigo-500" label="Staff" />
            <Legend color="bg-amber-500" label="Padres" />
          </div>
        </div>
      </div>

      {/* MODAL DE EVENTO REUTILIZANDO COMPONENTE UI MODAL */}
      {isModalOpen && (
        <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'create' ? 'Agendar Actividad' : 'Editar Actividad'} size="lg">
          <form onSubmit={handleSaveEvento} className="p-8 space-y-6">
            <div className="form-group">
              <label className="label">Título</label>
              <input
                className="input" required disabled={!canEdit}
                value={formEvento.titulo} onChange={e => setFormEvento({ ...formEvento, titulo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Fecha</label>
                <input className="input" type="date" required disabled={!canEdit} value={formEvento.fecha} onChange={e => setFormEvento({ ...formEvento, fecha: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Hora</label>
                <input className="input" type="time" disabled={!canEdit} value={formEvento.hora_inicio || ''} onChange={e => setFormEvento({ ...formEvento, hora_inicio: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">¿Para quién?</label>
              <select className="input" value={formEvento.destinatarios} onChange={e => setFormEvento({ ...formEvento, destinatarios: e.target.value as any })}>
                <option value="todos">Toda la comunidad</option>
                <option value="staff">Solo Personal Interno</option>
                <option value="apoderados">Solo Padres y Apoderados</option>
              </select>
            </div>

            {/* SECTOR DE CANALES REUTILIZADO DE COMUNICADOS */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Notificar por:</label>
              <div className="grid grid-cols-4 gap-2">
                <ChannelBtn active={canalEnvio === 'none'} onClick={() => setCanalEnvio('none')} icon={X} label="No enviar" />
                <ChannelBtn active={canalEnvio === 'email'} onClick={() => setCanalEnvio('email')} icon={Mail} label="Email" />
                <ChannelBtn active={canalEnvio === 'whatsapp'} onClick={() => setCanalEnvio('whatsapp')} icon={MessageCircle} label="WhatsApp" />
                <ChannelBtn active={canalEnvio === 'ambos'} onClick={() => setCanalEnvio('ambos')} icon={Send} label="Ambos" />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Descripción</label>
              <textarea
                className="input h-32 resize-none" disabled={!canEdit}
                value={formEvento.descripcion} onChange={e => setFormEvento({ ...formEvento, descripcion: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div>
                {modalMode === 'edit' && canEdit && (
                  <button type="button" className="btn-ghost text-red-500 flex items-center gap-2" onClick={handleDeleteEvento}>
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-semibold">Eliminar actividad</span>
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* SEGUNDO PASO: MODAL DE MENSAJERÍA REUTILIZADO */}
      {emailModal && (
        <ModalEnviarEmail
          open={!!emailModal}
          onClose={() => setEmailModal(null)}
          destinatarios={emailModal.destinatarios}
          contexto={emailModal.contexto}
          initialCanal={canalEnvio === 'none' ? 'whatsapp' : (canalEnvio as CanalMensaje)}
          initialAsunto={emailModal.initialAsunto}
          initialMensaje={emailModal.initialMensaje}
        />
      )}
    </div>
  )
}

function Legend({ color, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
    </div>
  )
}

function ChannelBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all 
        ${active ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' : 'border-transparent bg-white text-slate-400 hover:border-slate-100'}
      `}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-bold whitespace-nowrap">{label}</span>
    </button>
  )
}
