import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SoportePage() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const faqs = [
    {
      q: "¿Cómo recupero mi contraseña?",
      a: "En la pantalla de inicio de sesión, haz clic en '¿Olvidaste tu contraseña?'. Recibirás un correo con un enlace para crear una nueva clave segura."
    },
    {
      q: "¿Cómo agrego a un nuevo apoderado?",
      a: "Si eres Directora o Administrativa, ve al módulo 'Padres' y haz clic en 'Nuevo Padre/Apoderado'. Completa los datos y asígnalo a su respectivo estudiante."
    },
    {
      q: "¿La aplicación funciona sin internet?",
      a: "Bloom Education requiere una conexión activa a internet para sincronizar los datos en tiempo real. Sin embargo, estamos trabajando en un modo offline para el registro de asistencia."
    },
    {
      q: "¿Cómo envío un comunicado por WhatsApp?",
      a: "Dentro del módulo 'Comunicados', selecciona el curso destinatario, escribe tu mensaje y selecciona la opción 'Enviar vía WhatsApp'. Se generará el envío automático a los teléfonos registrados."
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Nav Minimalista */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-md border-bottom border-slate-100 flex items-center justify-between px-8">
        <button
          onClick={() => navigate('/')}
          className="text-xl font-bold bg-gradient-to-r from-rose-500 to-violet-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
        >
          🌸 Bloom Education
        </button>
        <button
          onClick={() => navigate('/')}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Volver al Inicio
        </button>
      </nav>

      <main className="max-w-5xl mx-auto pt-32 pb-20 px-6">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4 sm:text-5xl">
            Centro de Soporte
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            ¿Necesitas ayuda con Bloom? Estamos aquí para acompañarte en la digitalización de tu jardín.
          </p>
        </header>

        {/* Canales de Soporte */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </div>
            <h3 className="text-lg font-bold mb-2">Correo Electrónico</h3>
            <p className="text-slate-500 text-sm mb-4">Respuesta en menos de 24 horas hábiles.</p>
            <a href="mailto:info@bloom.digital-solutions-work" className="text-rose-500 font-semibold hover:underline">info@bloom.digital-solutions-work</a>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            </div>
            <h3 className="text-lg font-bold mb-2">WhatsApp Soporte</h3>
            <p className="text-slate-500 text-sm mb-4">Atención inmediata para urgencias de lunes a viernes.</p>
            <a href="https://wa.me/56995355996" className="text-green-500 font-semibold hover:underline">+56 9 95355996</a>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow text-center">
            <div className="w-12 h-12 bg-violet-50 text-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            </div>
            <h3 className="text-lg font-bold mb-2">Base de Conocimientos</h3>
            <p className="text-slate-500 text-sm mb-4">Pronto tendremos tutoriales paso a paso y guías de uso en video.</p>

          </div>
        </div>

        {/* FAQs */}
        <section className="bg-white rounded-[40px] p-12 border border-slate-100 shadow-sm">
          <h2 className="text-3xl font-bold mb-10 text-center">Preguntas Frecuentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {faqs.map((faq, idx) => (
              <div key={idx} className="group">
                <h4 className="text-lg font-bold mb-2 text-slate-800 group-hover:text-rose-500 transition-colors">
                  {faq.q}
                </h4>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-20 pt-10 border-t border-slate-200 text-center">
          <p className="text-slate-400 text-sm">
            Bloom Education Support Team · Hecho con ❤️ en Chile
          </p>
        </footer>
      </main>
    </div>
  )
}
