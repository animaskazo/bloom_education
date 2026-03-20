import { supabase } from '@/lib/supabase'

export interface EmailTarget {
    nombre: string
    email: string
}

export interface SendEmailParams {
    destinatarios: EmailTarget[]
    asunto: string
    mensaje: string
}

export interface SendEmailResult {
    enviados: number
    fallidos: number
    total: number
}

export function useEmailApoderados() {
    const enviarEmail = async (params: SendEmailParams): Promise<SendEmailResult> => {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: params,
        })

        if (error) throw error
        return data as SendEmailResult
    }

    return { enviarEmail }
}