import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function TerminosPage() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
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

      <main className="max-w-3xl mx-auto pt-32 pb-20 px-6">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4 sm:text-5xl">
            Términos de Uso
          </h1>
          <p className="text-lg text-slate-500">
            Última actualización: 14 de abril de 2026
          </p>
        </header>

        <div className="prose prose-slate prose-lg max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Aceptación de los Términos</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Al acceder y utilizar la plataforma Bloom Education, usted acepta estar sujeto a estos Términos y Condiciones, así como a todas las leyes aplicables en el territorio de la República de Chile.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Descripción del Servicio</h2>
            <p className="text-slate-600 leading-relaxed">
              Bloom Education es una Software as a Service (SaaS) diseñada para la gestión administrativa, pedagógica y de comunicación de establecimientos de educación parvularia y escolar en Chile. El servicio se presta "tal cual" y según disponibilidad.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">3. Derechos del Consumidor</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              En cumplimiento con la <strong>Ley No. 19.496 sobre Protección de los Derechos de los Consumidores</strong>, informamos que:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>Usted tiene derecho a una información veraz y oportuna sobre los servicios ofrecidos.</li>
              <li>A la protección de sus intereses económicos mediante la prohibición de cláusulas abusivas en los contratos de adhesión.</li>
              <li>Al cumplimiento fiel de lo pactado en las demostraciones y cotizaciones.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Cuentas y Seguridad</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              El usuario (Directora, Educadora o Apoderado) es responsable de mantener la confidencialidad de su contraseña y cuenta. Cualquier actividad bajo su cuenta será de su exclusiva responsabilidad.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Es mandatorio el uso de contraseñas robustas y el no compartir credenciales entre distintos funcionarios por seguridad de los datos de los menores.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Propiedad Intelectual</h2>
            <p className="text-slate-600 leading-relaxed">
              Todo el contenido, marcas, logos, códigos y diseños presentes en la plataforma son propiedad exclusiva de Bloom Education o de sus licenciantes, protegidos por la Ley No. 17.336 sobre Propiedad Intelectual en Chile.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Pagos y Suscripciones</h2>
            <p className="text-slate-600 leading-relaxed">
              Los establecimientos educacionales que contraten el servicio se rigen por los planes de precios vigentes al momento de la suscripción. Los pagos se realizan de forma mensual o anual según contrato. El incumplimiento en el pago puede derivar en la suspensión temporal de las funcionalidades de administración, manteniendo el acceso a los datos históricos por un periodo legal de 90 días.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">7. Limitación de Responsabilidad</h2>
            <p className="text-slate-600 leading-relaxed">
              Bloom Education no se hace responsable por interrupciones de servicio debidas a fallas en los proveedores de internet, infraestructuras de nube externas o mal uso de la plataforma por parte de los usuarios.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">8. Jurisdicción</h2>
            <p className="text-slate-600 leading-relaxed">
              Cualquier controversia derivada del uso de esta plataforma será sometida a las leyes de la República de Chile y a la competencia de los Tribunales Ordinarios de Justicia de la ciudad de Santiago.
            </p>
          </section>
        </div>

        <footer className="mt-20 pt-10 border-t border-slate-100 text-center">
          <p className="text-slate-400 text-sm">
            © 2026 Bloom Education. Santiago, Chile.
          </p>
        </footer>
      </main>
    </div>
  )
}
