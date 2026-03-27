import React, { createContext, useContext, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface MensajeTarget {
    nombre: string
    email?: string
    telefono?: string
}

export type CanalMensaje = 'email' | 'whatsapp' | 'ambos'

export interface SendMensajeParams {
    destinatarios: MensajeTarget[]
    asunto: string
    mensaje: string
    canal: CanalMensaje
}

export interface SendMensajeResult {
    enviadosEmail: number
    fallidosEmail: number
    enviadosWhatsapp: number
    fallidosWhatsapp: number
    total: number
}

interface MensajeriaContextType {
    isSending: boolean
    progress: { current: number; total: number }
    lastResult: SendMensajeResult | null
    enviarMensaje: (params: SendMensajeParams) => Promise<SendMensajeResult>
    resetResult: () => void
}

const MensajeriaContext = createContext<MensajeriaContextType | undefined>(undefined)

const formatPhone = (phone: string) => {
    let p = phone.replace(/\D/g, '')
    if (p.length === 8) return '569' + p
    if (p.length === 9 && p.startsWith('9')) return '56' + p
    if (p.startsWith('56')) return p
    return p
}

const sendWhatsApp = async (to: string, text: string, nombre: string) => {
    const phone = formatPhone(to)
    const response = await fetch(
        'https://rrszgzdkqlzaqbeqdohz.supabase.co/functions/v1/send-whatsapp',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phoneNumber: phone,
                type: 'template',
                template: {
                    name: 'send_information',
                    language: { code: 'es_MX' },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { "type": "text", "parameter_name": "name", "text": nombre },
                                { "type": "text", "parameter_name": "body", "text": text }
                            ],
                        },
                    ],
                }
            })
        }
    )
    return await response.json()
}

export function MensajeriaProvider({ children }: { children: React.ReactNode }) {
    const [isSending, setIsSending] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [lastResult, setLastResult] = useState<SendMensajeResult | null>(null)

    const enviarMensaje = useCallback(async (params: SendMensajeParams): Promise<SendMensajeResult> => {
        setIsSending(true)
        setLastResult(null)
        let enviadosEmail = 0, fallidosEmail = 0
        let enviadosWhatsapp = 0, fallidosWhatsapp = 0

        const { destinatarios, asunto, mensaje, canal } = params

        // Email logic
        if (canal === 'email' || canal === 'ambos') {
            const targetsEmail = destinatarios.filter(d => d.email)
            if (targetsEmail.length > 0) {
                try {
                    const { data, error } = await supabase.functions.invoke('send-email', {
                        body: { destinatarios: targetsEmail, asunto, mensaje },
                    })
                    if (error) throw error
                    enviadosEmail = data?.enviados || targetsEmail.length
                    fallidosEmail = data?.fallidos || 0
                } catch (e) {
                    fallidosEmail = targetsEmail.length
                }
            }
        }

        // WhatsApp logic
        if (canal === 'whatsapp' || canal === 'ambos') {
            const targetsWhatsapp = destinatarios.filter(d => d.telefono)
            const total = targetsWhatsapp.length
            setProgress({ current: 0, total })
            let localCount = 0

            if (total > 0) {
                const promises = targetsWhatsapp.map(async (target) => {
                    try {
                        await sendWhatsApp(target.telefono!, mensaje, target.nombre)
                        enviadosWhatsapp++
                    } catch (e) {
                        console.error("Error sending WA to", target.telefono, e)
                        fallidosWhatsapp++
                    } finally {
                        localCount++
                        setProgress({ current: localCount, total })
                    }
                })
                await Promise.all(promises)
            }
        }

        const result = {
            enviadosEmail, fallidosEmail,
            enviadosWhatsapp, fallidosWhatsapp,
            total: destinatarios.length
        }
        
        setLastResult(result)
        setIsSending(false)
        setProgress({ current: 0, total: 0 })
        return result
    }, [])

    const resetResult = () => setLastResult(null)

    return (
        <MensajeriaContext.Provider value={{ isSending, progress, lastResult, enviarMensaje, resetResult }}>
            {children}
        </MensajeriaContext.Provider>
    )
}

export function useMensajeriaGlobal() {
    const context = useContext(MensajeriaContext)
    if (context === undefined) {
        throw new Error('useMensajeriaGlobal must be used within a MensajeriaProvider')
    }
    return context
}
