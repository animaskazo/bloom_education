import { supabase } from '@/lib/supabase'

export interface SalesLeadParams {
  name: string
  email: string
  school: string
  phone: string
  planName: string
  billingCycle: 'mensual' | 'anual'
  message?: string
}

/**
 * Inserts the lead prospect into the DB and triggers a notification email via Resend (via Supabase Edge Function).
 */
export async function sendSalesLeadEmail(params: SalesLeadParams): Promise<{ success: boolean; error?: any }> {
  try {
    // 1. Insert prospect into supabase table prospectos_landing (optional fallback)
    try {
      await supabase.from('prospectos_landing' as any).insert([{
        nombre: params.name,
        email: params.email,
        jardin: params.school,
        telefono: params.phone,
        mensaje: `Plan: ${params.planName} (${params.billingCycle === 'anual' ? 'Anual - 10% desc.' : 'Mensual'}). ${params.message || ''}`,
        fuente: `pricing_${params.planName.toLowerCase().replace(/\s+/g, '_')}`
      }])
    } catch (dbErr) {
      console.warn('Database insert failed for lead prospect:', dbErr)
    }

    // 2. Invoke the Edge Function send-email to send the notification
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        destinatarios: [{
          nombre: 'Soporte Bloom',
          email: 'bloom@digital-solutions.work'
        }],
        asunto: `💼 Interés en Plan ${params.planName} - ${params.school}`,
        mensaje: `Has recibido una consulta de ventas desde el módulo de Pricing.\n\n` +
          `📦 Plan de Interés: ${params.planName} (${params.billingCycle === 'anual' ? 'Pago Anual - 10% Descuento' : 'Pago Mensual'})\n` +
          `👤 Nombre: ${params.name}\n` +
          `📧 Email: ${params.email}\n` +
          `🏫 Jardín/Institución: ${params.school}\n` +
          `📞 Teléfono: ${params.phone}\n\n` +
          `💬 Mensaje adicional:\n${params.message || 'Sin mensaje adicional.'}`
      }
    })

    if (error) throw error

    return { success: true }
  } catch (err) {
    console.error('Error sending sales lead email:', err)
    // Return success true if we at least tried and want to show a success state to prevent blocking user,
    // but include error details.
    return { success: false, error: err }
  }
}
