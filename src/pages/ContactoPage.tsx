import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMensajeriaGlobal } from '@/contexts/MensajeriaContext'
import { supabase } from '@/lib/supabase'

export default function ContactoPage() {
  const navigate = useNavigate()
  const { enviarMensaje } = useMensajeriaGlobal()
  
  const [formState, setFormState] = useState({ name: '', email: '', school: '', phone: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await supabase.from('prospectos_landing' as any).insert([{
        nombre: formState.name,
        email: formState.email,
        jardin: formState.school,
        telefono: formState.phone,
        mensaje: formState.message,
        fuente: 'contacto_page'
      }])

      await enviarMensaje({
        destinatarios: [{ nombre: 'Soporte Superdigital', email: 'info@superdigital.solutions' }],
        asunto: `📞 Contacto desde Web: ${formState.school}`,
        mensaje: `Nueva consulta desde la página de contacto:\n\n` +
          `👤 Nombre: ${formState.name}\n` +
          `📧 Email: ${formState.email}\n` +
          `🏫 Jardín: ${formState.school}\n` +
          `📞 Teléfono: ${formState.phone}\n\n` +
          `💬 Mensaje:\n${formState.message}`,
        canal: 'email'
      })

      setIsSubmitting(false)
      setIsSuccess(true)
      setFormState({ name: '', email: '', school: '', phone: '', message: '' })
    } catch (err) {
      console.error(err)
      setIsSubmitting(false)
      setIsSuccess(true)
    }
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-md border-bottom border-slate-100 flex items-center justify-between px-8">
        <button onClick={() => navigate('/')} className="text-xl font-bold bg-gradient-to-r from-rose-500 to-violet-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          🌸 Bloom Education
        </button>
        <button onClick={() => navigate('/')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
          Volver al Inicio
        </button>
      </nav>

      <main className="max-w-7xl mx-auto pt-32 pb-20 px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div className="space-y-8">
          <div>
            <span className="text-rose-500 font-bold uppercase tracking-widest text-sm">Hablemos</span>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 mt-4 mb-6 leading-tight">
              ¿Tienes dudas?<br />Estamos a un mensaje de distancia.
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed">
              Ya sea que quieras una demo personalizada, tengas dudas sobre la implementación o simplemente quieras decir hola, nuestro equipo en Santiago está listo para ayudarte.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <div>
                <h4 className="font-bold">Nuestra Oficina</h4>
                <p className="text-slate-500">Santiago, Chile</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <h4 className="font-bold">Email</h4>
                <p className="text-slate-500 text-rose-500 font-medium">hola@bloom.education</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-10 rounded-[40px] border border-slate-100 shadow-sm">
          {isSuccess ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-6">✨</div>
              <h2 className="text-3xl font-bold mb-4">¡Mensaje Recibido!</h2>
              <p className="text-slate-500 mb-8">Te responderemos a la brevedad posible.</p>
              <button 
                onClick={() => setIsSuccess(false)}
                className="bg-slate-900 text-white px-8 py-3 rounded-full hover:bg-slate-800 transition-colors"
              >
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Nombre</label>
                  <input 
                    type="text" required placeholder="Juana de la Hoz"
                    value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1">Email</label>
                  <input 
                    type="email" required placeholder="juanita@jardin.cl"
                    value={formState.email} onChange={e => setFormState({...formState, email: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Jardín / Institución</label>
                <input 
                  type="text" required placeholder="Jardín Infantil Los Girasoles"
                  value={formState.school} onChange={e => setFormState({...formState, school: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">Teléfono</label>
                <input 
                  type="tel" required placeholder="+56 9 ..."
                  value={formState.phone} onChange={e => setFormState({...formState, phone: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase ml-1">¿En qué podemos ayudarte?</label>
                <textarea 
                  required placeholder="Cuéntanos un poco más sobre lo que buscas..."
                  value={formState.message} onChange={e => setFormState({...formState, message: e.target.value})}
                  className="w-full h-32 bg-white border border-slate-200 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
                />
              </div>
              <button 
                type="submit" disabled={isSubmitting}
                className="w-full bg-slate-900 text-white rounded-2xl py-4 font-bold text-lg hover:bg-slate-800 transform active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
