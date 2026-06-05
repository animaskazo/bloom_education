import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendSalesLeadEmail } from '@/lib/emailService'
import { Check, ArrowLeft, Send } from 'lucide-react'

interface Plan {
  id: string
  name: string
  priceMonthly: number
  description: string
  features: string[]
  ctaText: string
  featured?: boolean
  premium?: boolean
}

export default function PricingPage() {
  const navigate = useNavigate()
  const [billingCycle, setBillingCycle] = useState<'mensual' | 'anual'>('mensual')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  
  // Contact Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [school, setSchool] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const plans: Plan[] = [
    {
      id: 'base',
      name: 'Bloom Base',
      priceMonthly: 1.5,
      description: 'Para jardines que buscan digitalizarse sin fricción.',
      features: [
        'Agenda digital y control de asistencia diaria.',
        'Módulo de comunicaciones y circulares.',
        'Ficha de alumnos.',
        'Control de pagos.',
        'Control de proveedores y gastos.',
        'Soporte técnico por email.'
      ],
      ctaText: 'Comenzar con Base'
    },
    {
      id: 'plus',
      name: 'Bloom Plus',
      priceMonthly: 2.5,
      description: 'Control total: alumnos y mensualidades en una sola pantalla.',
      features: [
        'Todo lo de Base, más:',
        'Control de cupos y matrículas.',
        'Pagos a través de link.',
        'Aplicación para padres (Fotos, actividades y libreta virtual).',
        'Soporte prioritario por WhatsApp.'
      ],
      ctaText: 'Elegir Plan Plus',
      featured: true
    },
    {
      id: 'premium',
      name: 'Bloom Premium',
      priceMonthly: 4.5,
      description: 'Piloto automático: cobranza integrada y decisiones con IA.',
      features: [
        'Todo lo de Plus, más:',
        'Pagos con PAC y PAT.',
        'Integración de WhatsApp para la comunicación de los apoderados.',
        'Reportes gerenciales procesados por IA.',
        'Recordatorios automáticos de morosidad.'
      ],
      ctaText: 'Agendar Demo VIP',
      premium: true
    }
  ]

  const getPrice = (basePrice: number) => {
    if (billingCycle === 'anual') {
      // 10% discount
      return (basePrice * 0.9).toFixed(2)
    }
    return basePrice.toFixed(1)
  }

  const handleOpenModal = (plan: Plan) => {
    setSelectedPlan(plan)
    setIsSuccess(false)
    setErrorMessage(null)
  }

  const handleCloseModal = () => {
    setSelectedPlan(null)
    // Clear form
    setName('')
    setEmail('')
    setSchool('')
    setPhone('')
    setMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await sendSalesLeadEmail({
      name,
      email,
      school,
      phone,
      planName: selectedPlan.name,
      billingCycle,
      message
    })

    setIsSubmitting(false)
    if (result.success) {
      setIsSuccess(true)
    } else {
      setErrorMessage('Ocurrió un error al enviar tu solicitud. Por favor intenta nuevamente.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8">
        <button onClick={() => navigate('/')} className="text-xl font-bold bg-gradient-to-r from-rose-500 to-violet-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          🌸 Bloom Education
        </button>
        <button onClick={() => navigate('/')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Volver al Inicio
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto pt-32 pb-24 px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-brand-600 font-bold uppercase tracking-widest text-xs px-3 py-1 bg-brand-50 rounded-full">Nuestros Precios</span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mt-4 mb-6 tracking-tight leading-tight">
            Planes diseñados para el tamaño de tu jardín.
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            Digitaliza, ordena y automatiza tu administración. Sin cobros por cantidad de educadoras, elige el plan que mejor resuelva tus necesidades hoy.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-slate-200 p-1.5 rounded-full shadow-sm">
            <button
              onClick={() => setBillingCycle('mensual')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'mensual'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Pago Mensual
            </button>
            <button
              onClick={() => setBillingCycle('anual')}
              className={`relative px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                billingCycle === 'anual'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Pago Anual
              <span className="absolute -top-3 -right-3 bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                -10%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {plans.map((plan) => {
            // Determine styles
            let cardClasses = 'bg-white border border-slate-200'
            let ctaClasses = 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            
            if (plan.featured) {
              cardClasses = 'bg-white border-2 border-brand-500 shadow-xl scale-100 lg:scale-[1.03] z-10 relative'
              ctaClasses = 'bg-brand-600 hover:bg-brand-700 text-white shadow-md'
            } else if (plan.premium) {
              cardClasses = 'bg-slate-900 text-white border border-slate-800 shadow-xl'
              ctaClasses = 'bg-white hover:bg-slate-100 text-slate-950 shadow-md'
            }

            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-3xl p-8 transition-all duration-300 hover:translate-y-[-4px] ${cardClasses}`}
              >
                {plan.featured && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-[11px] font-extrabold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Recomendado
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold tracking-tight mb-2">{plan.name}</h3>
                  <p className={`text-sm ${plan.premium ? 'text-slate-400' : 'text-slate-500'} mb-6 min-h-[40px]`}>
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">{getPrice(plan.priceMonthly)} UF</span>
                    <span className={`text-sm ${plan.premium ? 'text-slate-400' : 'text-slate-500'}`}>/ mes</span>
                  </div>
                  {billingCycle === 'anual' && (
                    <span className="text-xs text-rose-500 font-semibold block mt-1">
                      Facturado anualmente
                    </span>
                  )}
                </div>

                <hr className={`my-6 ${plan.premium ? 'border-slate-800' : 'border-slate-100'}`} />

                <ul className="space-y-4 flex-1 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex gap-3 items-start text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                      <span className={plan.premium ? 'text-slate-300' : 'text-slate-700'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleOpenModal(plan)}
                  className={`w-full py-4 rounded-xl font-bold transition-all text-center select-none active:scale-[0.98] ${ctaClasses}`}
                >
                  {plan.ctaText}
                </button>
              </div>
            )
          })}
        </div>
      </main>

      {/* Contact Sales Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-brand-600 uppercase tracking-wide">Contactar Ventas</span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">{selectedPlan.name}</h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-150 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {isSuccess ? (
                <div className="text-center py-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 text-3xl mb-4">
                    ✨
                  </div>
                  <h4 className="text-2xl font-bold text-slate-950 mb-2">¡Solicitud recibida!</h4>
                  <p className="text-slate-500 max-w-sm mb-6">
                    Hemos registrado tu interés en el <strong>{selectedPlan.name}</strong> ({billingCycle === 'anual' ? 'Anual' : 'Mensual'}). Nos pondremos en contacto contigo en breve.
                  </p>
                  <button
                    onClick={handleCloseModal}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Nombre completo</label>
                    <input
                      type="text" required placeholder="Ej: Alejandra Gómez"
                      value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                      <input
                        type="email" required placeholder="directora@jardin.cl"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase">Teléfono</label>
                      <input
                        type="tel" required placeholder="+56 9 1234 5678"
                        value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Jardín / Institución</label>
                    <input
                      type="text" required placeholder="Jardín Infantil Flor de Loto"
                      value={school} onChange={(e) => setSchool(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">¿Quieres agregar un mensaje?</label>
                    <textarea
                      placeholder="Cuéntanos más sobre tu establecimiento..."
                      value={message} onChange={(e) => setMessage(e.target.value)}
                      className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm resize-none"
                      disabled={isSubmitting}
                    />
                  </div>

                  {errorMessage && (
                    <p className="text-xs text-rose-500 font-semibold">{errorMessage}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      'Enviando...'
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Solicitar Demo & Plan
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
