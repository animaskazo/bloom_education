import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    let loginEmail = email.trim()
    console.log('🔍 Intentando login con:', loginEmail)

    // Si no tiene @, asumimos que es un RUT
    if (!loginEmail.includes('@')) {
      const cleanRUT = loginEmail.replace(/[^0-9kK]/g, '').toUpperCase()
      console.log('📄 Es un RUT. Buscando email asociado...')

      const { data: emailRows, error: rpcErr } = await supabase
        .rpc('obtener_email_por_rut', { p_rut: loginEmail })

      if (rpcErr) console.error('❌ Error en RPC login:', rpcErr)

      if (emailRows && emailRows.length > 0) {
        loginEmail = emailRows[0].email
        console.log('✨ Email encontrado:', loginEmail)
      } else {
        // Fallback: tratar como email interno si no se encontró en perfiles
        loginEmail = `${cleanRUT}@bloom-staff.cl`.toLowerCase()
        console.log('⚠️ Sin perfil. Usando:', loginEmail)
      }
    } else {
      loginEmail = loginEmail.toLowerCase()
    }

    const { error } = await signIn(loginEmail, password)
    setLoading(false)
    if (error) {
      console.error('❌ Error de Auth:', error)
      setError('Credenciales incorrectas. Verifica tu RUT/Email y contraseña.')
      return
    }
    console.log('✅ Login exitoso!')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-lg mb-4">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">Bloom</h1>
          <p className="text-slate-500 mt-1 text-sm">Plataforma de Gestión Educacional</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-slate-500 mb-6">Ingresa con tus credenciales institucionales</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="label">RUT o Correo Electrónico</label>
              <input
                type="text"
                className="input"
                placeholder="12.345.678-9"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="text-xs text-slate-400 text-center space-y-1">
              <p>¿Olvidaste tu contraseña? Contacta a tu administrador</p>
              <p className="font-medium text-slate-500">Complejo Educacional — Chile</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} Bloom SaaS · Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}
