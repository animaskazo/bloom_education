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

const formatPhone = (phone: string) => {
    let p = phone.replace(/\D/g, '')
    if (p.length === 8) return '569' + p
    if (p.length === 9 && p.startsWith('9')) return '56' + p
    if (p.startsWith('56')) return p
    // fallback
    return p
}

const sendWhatsApp = async (to: string, text: string, nombre: string) => {
    const phone = formatPhone(to)
    const response = await fetch(
        'https://rrszgzdkqlzaqbeqdohz.supabase.co/functions/v1/send-whatsapp',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumber: phone,
                type: 'template',
                template: {
                    name: 'send_information', // ← reemplaza con el nombre exacto
                    language: { code: 'es_MX' },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                {
                                    "type": "text",
                                    "parameter_name": "name",
                                    "text": nombre
                                },
                                {
                                    "type": "text",
                                    "parameter_name": "body",
                                    "text": text
                                }
                            ],
                        },
                    ],
                }
            })
        }
    )

    return await response.json()
}

export function useMensajeriaApoderados() {
    const enviarMensaje = async (params: SendMensajeParams): Promise<SendMensajeResult> => {
        let enviadosEmail = 0, fallidosEmail = 0
        let enviadosWhatsapp = 0, fallidosWhatsapp = 0

        const { destinatarios, asunto, mensaje, canal } = params

        if (canal === 'email' || canal === 'ambos') {
            const targetsEmail = destinatarios.filter(d => d.email)
            if (targetsEmail.length > 0) {
                try {
                    const { data, error } = await supabase.functions.invoke('send-email', {
                        body: {
                            destinatarios: targetsEmail,
                            asunto,
                            mensaje
                        },
                    })
                    if (error) throw error
                    enviadosEmail = data?.enviados || targetsEmail.length
                    fallidosEmail = data?.fallidos || 0
                } catch (e) {
                    fallidosEmail = targetsEmail.length
                }
            }
        }

        if (canal === 'whatsapp' || canal === 'ambos') {
            const targetsWhatsapp = destinatarios.filter(d => d.telefono)
            for (const target of targetsWhatsapp) {
                try {
                    await sendWhatsApp(target.telefono!, mensaje, target.nombre)
                    enviadosWhatsapp++
                } catch (e) {
                    console.error("Error sending WA to", target.telefono, e)
                    fallidosWhatsapp++
                }
            }
        }

        return {
            enviadosEmail,
            fallidosEmail,
            enviadosWhatsapp,
            fallidosWhatsapp,
            total: destinatarios.length
        }
    }

    return { enviarMensaje }
}
