import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PrivacidadPage() {
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
            Política de Privacidad
          </h1>
          <p className="text-lg text-slate-500">
            Última actualización: 14 de abril de 2026
          </p>
        </header>

        <div className="prose prose-slate prose-lg max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">1. Compromiso con la Privacidad</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              En Bloom Education, operado bajo el marco legal de la República de Chile, nos tomamos muy en serio la privacidad de los datos de nuestros usuarios, especialmente considerando que procesamos información sensible relacionada con menores de edad en establecimientos educacionales.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Esta política cumple con lo establecido en la <strong>Ley No. 19.628 sobre Protección de la Vida Privada</strong> y sus modificaciones posteriores.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">2. Información que Recopilamos</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Recopilamos datos necesarios para la prestación del servicio educativo y administrativo:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li><strong>Datos de Establecimientos:</strong> Nombre, RUT, dirección, contacto legal.</li>
              <li><strong>Datos de Personal:</strong> Nombre, RUT, cargo, contacto.</li>
              <li><strong>Datos de Estudiantes:</strong> Nombre, RUT, fecha de nacimiento, grupo sanguíneo, alergias (información sensible bajo ley chilena).</li>
              <li><strong>Datos de Apoderados:</strong> Nombre, RUT, relación de parentesco, datos de contacto.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">3. Finalidad del Tratamiento</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              De acuerdo con el Artículo 4 de la Ley 19.628, el tratamiento de datos personales se realiza únicamente para las siguientes finalidades autorizadas:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li>Gestión administrativa y académica del establecimiento educacional.</li>
              <li>Comunicación directa entre el establecimiento y el apoderado (Agenda Diaria).</li>
              <li>Gestión de cobranza y pagos de mensualidades.</li>
              <li>Seguridad de los menores dentro del recinto escolar.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">4. Derechos de los Titulares (ARCO)</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Usted tiene derechos garantizados por la legislación chilena sobre sus datos personales:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-600">
              <li><strong>Acceso:</strong> Saber qué datos tenemos de usted o sus pupilas.</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos.</li>
              <li><strong>Cancelación:</strong> Solicitar la eliminación cuando ya no sean necesarios para los fines legales.</li>
              <li><strong>Oposición:</strong> Negarse al tratamiento para fines específicos no esenciales.</li>
            </ul>
            <p className="mt-4 text-slate-600">
              Para ejercer estos derechos, puede escribirnos a <span className="font-semibold text-rose-500">privacidad@bloom.education</span>.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">5. Seguridad de la Información</h2>
            <p className="text-slate-600 leading-relaxed">
              Utilizamos encriptación de grado bancario (SSL/TLS) y bases de datos seguras (Supabase/PostgreSQL) con políticas de seguridad de nivel de fila (RLS) para asegurar que solo el personal autorizado tenga acceso a la información según su rol.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">6. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              Utilizamos cookies técnicas estrictamente necesarias para mantener la sesión iniciada y mejorar la seguridad de la navegación. No utilizamos cookies de rastreo publicitario de terceros.
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
