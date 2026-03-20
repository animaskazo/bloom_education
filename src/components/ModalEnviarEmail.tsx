import { useState } from 'react'
import { Modal } from '@/components/ui'
import { Send, Loader2, Mail, Users, User } from 'lucide-react'
import { useEmailApoderados, EmailTarget } from '@/hooks/useEmailApoderados'

interface Props {
    open: boolean
    onClose: () => void
    destinatarios: EmailTarget[]
    contexto: string // ej: "Juan Pérez" | "Curso 1°A" | "todos los apoderados"
}

export function ModalEnviarEmail({ open, onClose, destinatarios, contexto }: Props) {
    const { enviarEmail } = useEmailApoderados()
    const [asunto, setAsunto] = useState('')
    const [mensaje, setMensaje] = useState('')
    const [estado, setEstado] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [resultado, setResultado] = useState('')

    const handleClose = () => {
        setAsunto(''); setMensaje(''); setEstado('idle'); setResultado('')
        onClose()
    }

    const handleEnviar = async () => {
        if (!asunto.trim() || !mensaje.trim()) return
        setEstado('loading')
        try {
            const res = await enviarEmail({ destinatarios, asunto, mensaje })
            setResultado(`${res.enviados} de ${res.total} emails enviados correctamente.${res.fallidos > 0 ? ` (${res.fallidos} fallidos)` : ''}`)
            setEstado('success')
        } catch {
            setResultado('Error al enviar. Verifica tu configuración de EmailJS.')
            setEstado('error')
        }
    }

    const esMultiple = destinatarios.length > 1
    const IconoScope = esMultiple ? Users : User

    return (
        <Modal open={open} onClose={handleClose} title="Enviar comunicado por email" size="lg">
            <div className="p-6 space-y-4">

                {/* Destinatarios */}
                <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IconoScope className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Destinatarios</p>
                        <p className="text-sm font-semibold text-slate-700">{contexto}</p>
                        <p className="text-xs text-slate-400">
                            {destinatarios.length === 1
                                ? destinatarios[0].email || 'Sin email registrado'
                                : `${destinatarios.length} apoderados`}
                        </p>
                    </div>
                </div>

                {/* Alerta si hay apoderados sin email */}
                {destinatarios.some(d => !d.email) && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        ⚠️ {destinatarios.filter(d => !d.email).length} apoderado(s) sin email registrado serán omitidos.
                    </div>
                )}

                {/* Asunto */}
                <div className="form-group">
                    <label className="label">Asunto</label>
                    <input
                        className="input"
                        placeholder="Ej: Reunión de apoderados — Junio"
                        value={asunto}
                        onChange={e => setAsunto(e.target.value)}
                        disabled={estado === 'loading' || estado === 'success'}
                    />
                </div>

                {/* Mensaje */}
                <div className="form-group">
                    <label className="label">Mensaje</label>
                    <textarea
                        className="input resize-none"
                        rows={5}
                        placeholder="Escribe el mensaje aquí..."
                        value={mensaje}
                        onChange={e => setMensaje(e.target.value)}
                        disabled={estado === 'loading' || estado === 'success'}
                    />
                </div>

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
                            disabled={estado === 'loading' || !asunto.trim() || !mensaje.trim() || destinatarios.filter(d => d.email).length === 0}
                        >
                            {estado === 'loading'
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                                : <><Send className="w-4 h-4" /> Enviar email</>}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    )
}