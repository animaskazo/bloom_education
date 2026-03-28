import { useState } from 'react'
import { Modal } from '@/components/ui'
import { Send, Loader2, Mail, Users, User, MessageCircle } from 'lucide-react'
import { useMensajeriaGlobal, MensajeTarget, CanalMensaje } from '@/contexts/MensajeriaContext'

interface Props {
    open: boolean
    onClose: () => void
    destinatarios: MensajeTarget[]
    contexto: string // ej: "Juan Pérez" | "Curso 1°A" | "todos los apoderados"
    onSuccess?: (res: any) => void
    initialCanal?: CanalMensaje | 'none'
    initialAsunto?: string
    initialMensaje?: string
}

export function ModalEnviarEmail({ open, onClose, destinatarios, contexto, onSuccess, initialCanal, initialAsunto, initialMensaje }: Props) {
    const { enviarMensaje, isSending } = useMensajeriaGlobal()
    const [asunto, setAsunto] = useState(initialAsunto || '')
    const [mensaje, setMensaje] = useState(initialMensaje || '')
    const [canal, setCanal] = useState<CanalMensaje>(initialCanal && initialCanal !== 'none' ? initialCanal as CanalMensaje : 'whatsapp')
    const [estado, setEstado] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [resultado, setResultado] = useState('')

    const handleClose = () => {
        if (isSending) {
            onClose()
            return
        }
        setAsunto(''); setMensaje(''); setEstado('idle'); setResultado(''); setCanal('whatsapp')
        onClose()
    }

    const handleEnviar = async () => {
        if (!mensaje.trim()) return
        if ((canal === 'email' || canal === 'ambos') && !asunto.trim()) return

        setEstado('loading')
        try {
            const res = await enviarMensaje({ destinatarios, asunto: (canal === 'whatsapp' ? '' : asunto), mensaje, canal })

            let resText = ''
            if (canal === 'email' || canal === 'ambos') {
                resText += `${res.enviadosEmail} emails enviados`
                if (res.fallidosEmail > 0) resText += ` (${res.fallidosEmail} fallidos)`
                resText += '. '
            }
            if (canal === 'whatsapp' || canal === 'ambos') {
                resText += `${res.enviadosWhatsapp} WhatsApp enviados`
                if (res.fallidosWhatsapp > 0) resText += ` (${res.fallidosWhatsapp} fallidos)`
                resText += '.'
            }

            setResultado(resText)
            setEstado('success')
            if (onSuccess) onSuccess(res)
        } catch {
            setResultado('Error al enviar. Verifica tu configuración.')
            setEstado('error')
        }
    }

    const esMultiple = destinatarios.length > 1
    const IconoScope = esMultiple ? Users : User

    const hasEmail = destinatarios.some(d => d.email)
    const hasPhone = destinatarios.some(d => d.telefono)

    return (
        <Modal open={open} onClose={handleClose} title="Enviar comunicado" size="lg">
            <div className="p-6 space-y-4">

                {/* Destinatarios */}
                <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IconoScope className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Destinatarios</p>
                        <p className="text-sm font-semibold text-slate-700">{contexto}</p>
                        <p className="text-xs text-slate-400">
                            {destinatarios.length === 1
                                ? `${destinatarios[0].email || 'Sin email'} • ${destinatarios[0].telefono || 'Sin teléfono'}`
                                : `${destinatarios.length} apoderados seleccionados`}
                        </p>
                        
                        {esMultiple && (
                            <div className="mt-2 bg-white/50 border border-slate-200/50 rounded-lg p-2 max-h-24 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {destinatarios.map((d, i) => (
                                        <div key={i} className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                                            <span className="text-[10px] text-slate-500 truncate font-medium">
                                                {d.nombre} <span className="text-slate-300 font-normal">({d.email || d.telefono || 'Sin datos'})</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Selección de Canal */}
                <div className="form-group">
                    <label className="label">¿Por dónde enviar el comunicado?</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors ${canal === 'email' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}
                            onClick={() => setCanal('email')}
                        >
                            <Mail className={`w-5 h-5 mb-1 ${canal === 'email' ? 'text-brand-500' : 'text-slate-400'}`} />
                            <span className="text-xs font-semibold">Email</span>
                        </button>
                        <button
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors ${canal === 'whatsapp' ? 'border-[#25D366] bg-[#25D366]/10 text-[#075E54]' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}
                            onClick={() => setCanal('whatsapp')}
                        >
                            <MessageCircle className={`w-5 h-5 mb-1 ${canal === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-400'}`} />
                            <span className="text-xs font-semibold">WhatsApp</span>
                        </button>
                        <button
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-colors ${canal === 'ambos' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}
                            onClick={() => setCanal('ambos')}
                        >
                            <div className="flex mb-1">
                                <Send className={`w-4 h-4 -mr-1 z-10 ${canal === 'ambos' ? 'text-indigo-500' : 'text-slate-400'}`} />
                            </div>
                            <span className="text-xs font-semibold">Email y WhatsApp</span>
                        </button>
                    </div>
                </div>

                {/* Alertas sobre canales */}
                {((canal === 'email' || canal === 'ambos') && !hasEmail) && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        ⚠️ Ningún apoderado seleccionado tiene email registrado.
                    </div>
                )}
                {((canal === 'whatsapp' || canal === 'ambos') && !hasPhone) && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        ⚠️ Ningún apoderado seleccionado tiene teléfono registrado.
                    </div>
                )}

                {/* Asunto (Solo si incluye Email) */}
                {(canal === 'email' || canal === 'ambos') && (
                    <div className="form-group animate-fade-in">
                        <label className="label">Asunto del Email</label>
                        <input
                            className="input"
                            placeholder="Ej: Reunión de apoderados — Junio"
                            value={asunto}
                            onChange={e => setAsunto(e.target.value)}
                            disabled={estado === 'loading' || estado === 'success'}
                        />
                    </div>
                )}

                {/* Mensaje */}
                <div className="form-group">
                    <label className="label">Mensaje</label>
                    <textarea
                        className="input resize-none"
                        rows={5}
                        placeholder={canal === 'whatsapp' ? "Escribe el mensaje de WhatsApp aquí..." : "Escribe el mensaje aquí..."}
                        value={mensaje}
                        onChange={e => setMensaje(e.target.value)}
                        disabled={estado === 'loading' || estado === 'success'}
                    />
                </div>

                {estado === 'loading' && (
                    <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 flex items-center gap-3 animate-pulse">
                        <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                        <div>
                            <p className="text-sm font-bold text-brand-700">Enviando comunicado...</p>
                            <p className="text-xs text-brand-600">Puedes cerrar esta ventana, el progreso seguirá en la parte superior.</p>
                        </div>
                    </div>
                )}

                {/* Feedback */}
                {estado === 'success' && (
                    <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                        ✓ {resultado}
                    </div>
                )}
                {estado === 'error' && (
                    <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                        {resultado}
                    </div>
                )}

                {/* Acciones */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button className="btn-secondary" onClick={handleClose}>
                        {estado === 'success' ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {estado !== 'success' && (
                        <button
                            className="btn-primary flex items-center gap-2"
                            onClick={handleEnviar}
                            disabled={estado === 'loading' || !mensaje.trim() || ((canal === 'email' || canal === 'ambos') && !asunto.trim()) || ((canal === 'email' && !hasEmail) || (canal === 'whatsapp' && !hasPhone) || (canal === 'ambos' && !hasEmail && !hasPhone))}
                        >
                            {estado === 'loading'
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                                : <><Send className="w-4 h-4" /> Enviar comunicado</>}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    )
}