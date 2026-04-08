import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle2, UserPlus } from 'lucide-react'

type LoginView = 'login' | 'verify-identity' | 'create-pin' | 'success'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  
  // States
  const [email, setEmail] = useState('') // Usado como RUT en login
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isApoderado, setIsApoderado] = useState(false)
  
  // Onboarding States
  const [view, setView] = useState<LoginView>('login')
  const [parentRut, setParentRut] = useState('')
  const [childRut, setChildRut] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [parentEmail, setParentEmail] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    let loginEmail = email.trim()
    
    if (!loginEmail.includes('@')) {
      const cleanRUT = loginEmail.replace(/[^0-9kK]/g, '').toUpperCase()
      
      if (isApoderado) {
        const { data: apodRows, error: apodErr } = await supabase.rpc('obtener_email_apoderado', { p_rut: loginEmail.trim() })
        if (apodErr) {
          console.error("RPC Error:", apodErr)
          setError('Error contactando base de datos: ' + apodErr.message)
          setLoading(false)
          return
        }

        if (apodRows && apodRows.length > 0 && apodRows[0].email) {
          loginEmail = apodRows[0].email
          console.log("Email encontrado para apoderado:", loginEmail) // debug
        } else {
          setError('No encontramos ninguna cuenta vinculada a este RUT. Verifica que tu colegio te haya registrado.')
          setLoading(false)
          return
        }
      } else {
        const { data: emailRows } = await supabase.rpc('obtener_email_por_rut', { p_rut: cleanRUT })
        if (emailRows && emailRows.length > 0) {
          loginEmail = emailRows[0].email
        } else {
          loginEmail = `${cleanRUT}@bloom-staff.cl`.toLowerCase()
        }
      }
    } else {
      loginEmail = loginEmail.toLowerCase()
    }

    const { error } = await signIn(loginEmail, password)
    setLoading(false)
    if (error) {
      console.error("Auth signIn error:", error)
      if (error.includes('Email not confirmed')) {
        setError('El sistema requiere confirmación por email por defecto. Configura Supabase > Authentication para deshabilitar "Confirm email".')
      } else if (error.includes('Invalid login credentials')) {
        setError('El PIN o el RUT son incorrectos. Intenta de nuevo.')
      } else {
        setError(`Credenciales incorrectas: ${error}`)
      }
      return
    }
    
    navigate(isApoderado ? '/apoderado' : '/dashboard')
  }

  async function handleVerifyIdentity(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Enviamos los RUTs (la función SQL en el servidor se encarga de comparar formatos)
      const { data, error: rpcError } = await supabase.rpc('verificar_vinculo_onboarding', {
        p_rut_apoderado: parentRut.trim(),
        p_rut_estudiante: childRut.trim()
      })

      if (rpcError) throw new Error(rpcError.message)

      // El RPC retorna una tabla con email_resultado (que es el email del apoderado)
      if (data && data.length > 0 && (data[0] as any).email_resultado) {
        setParentEmail((data[0] as any).email_resultado)
        setView('create-pin')
      } else {
        throw new Error('No encontramos un vínculo válido entre esos RUTs. Asegúrate de estar vinculado a este alumno en el sistema.')
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePin(e: FormEvent) {
    e.preventDefault()
    setError('')
    
    if (newPin.length !== 6) {
      setError('El PIN debe tener exactamente 6 números.')
      return
    }
    if (newPin !== confirmPin) {
      setError('Los PINs no coinciden.')
      return
    }

    setLoading(true)
    // Registrar usuario en Supabase Auth
    // Nota: Usamos signUp. Enviamos el rol explícito para que el trigger lo tome.
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: parentEmail,
      password: newPin,
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Este correo ya tiene un acceso creado. Si olvidaste tu PIN, contacta a soporte.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    // Vincular perfil de Supabase con el registro del apoderado de forma segura y corregir el rol
    if (authData?.user) {
      const { error: linkErr } = await supabase.rpc('vincular_perfil_apoderado', {
        p_email: parentEmail,
        p_perfil_id: authData.user.id
      })
      if (linkErr) {
        console.error("Error al vincular perfil del apoderado:", linkErr)
      }
    }

    setLoading(false)
    setView('success')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-lg mb-4">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-slate-900">Bloom</h1>
          <p className="text-slate-500 mt-1 text-sm">Plataforma de Gestión Educacional</p>
        </div>

        <div className="card p-8 shadow-2xl border-none">
          {view === 'login' && (
            <>
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button 
                  type="button"
                  onClick={() => { setIsApoderado(false); setError(''); setPassword(''); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isApoderado ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Staff / Colegio
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsApoderado(true); setError(''); setPassword(''); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isApoderado ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Apoderados
                </button>
              </div>

              <h2 className="text-xl font-bold text-slate-800 mb-1">
                {isApoderado ? 'Ingreso Apoderado' : 'Iniciar sesión'}
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                {isApoderado ? 'Accede con tu RUT y PIN de 6 dígitos' : 'Ingresa con tus credenciales institucionales'}
              </p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="form-group">
                  <label className="label">RUT</label>
                  <input
                    type="text"
                    className="input text-lg font-medium"
                    placeholder="12.345.678-9"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">{isApoderado ? 'PIN de 6 dígitos' : 'Contraseña'}</label>
                  <div className="relative">
                    <input
                      type={isApoderado ? 'password' : (showPass ? 'text' : 'password')}
                      inputMode={isApoderado ? 'numeric' : 'text'}
                      maxLength={isApoderado ? 6 : undefined}
                      className={`input pr-10 text-lg tracking-[0.5em] ${isApoderado ? 'text-center' : ''}`}
                      placeholder={isApoderado ? '••••••' : '••••••••'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    {!isApoderado && (
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-4 mt-2 text-base font-bold shadow-lg shadow-brand-100">
                  {loading ? 'Ingresando...' : 'Entrar a Bloom'}
                </button>
              </form>

              {isApoderado && (
                <div className="mt-6 text-center">
                  <button 
                    onClick={() => setView('verify-identity')}
                    className="text-xs font-bold text-brand-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> ¿Primera vez? Crea tu PIN aquí
                  </button>
                </div>
              )}
            </>
          )}

          {view === 'verify-identity' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <button onClick={() => setView('login')} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 mb-6">
                <ArrowLeft className="w-3 h-3" /> Volver al login
              </button>
              <h2 className="text-xl font-bold text-slate-800 mb-1">Primer Ingreso</h2>
              <p className="text-sm text-slate-500 mb-6">Valida tu identidad vinculando tu RUT con el de tu hijo/a.</p>
              
              {error && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl mb-4 border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyIdentity} className="space-y-4">
                <div className="form-group">
                  <label className="label">Tu RUT (Apoderado)</label>
                  <input className="input" placeholder="12.345.678-9" value={parentRut} onChange={e => setParentRut(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="label">RUT de tu hijo/a (Alumno)</label>
                  <input className="input" placeholder="23.456.789-0" value={childRut} onChange={e => setChildRut(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 font-bold shadow-lg">
                  {loading ? 'Verificando...' : 'Verificar Identidad'}
                </button>
              </form>
            </div>
          )}

          {view === 'create-pin' && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-slate-800 mb-1">Crea tu PIN</h2>
              <p className="text-sm text-slate-500 mb-6">Ingresa un código de 6 números que sea fácil de recordar para ti.</p>
              
              {error && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl mb-4 border border-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreatePin} className="space-y-4 text-center">
                <div className="form-group text-left">
                  <label className="label">Nuevo PIN (6 dígitos)</label>
                  <input 
                    type="password" 
                    inputMode="numeric" 
                    maxLength={6} 
                    className="input text-center text-2xl tracking-[1em]" 
                    value={newPin} 
                    onChange={e => setNewPin(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group text-left">
                  <label className="label">Confirmar PIN</label>
                  <input 
                    type="password" 
                    inputMode="numeric" 
                    maxLength={6} 
                    className="input text-center text-2xl tracking-[1em]" 
                    value={confirmPin} 
                    onChange={e => setConfirmPin(e.target.value)} 
                    required 
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 font-bold shadow-lg">
                  {loading ? 'Creando Acceso...' : 'Guardar PIN y Entrar'}
                </button>
              </form>
            </div>
          )}

          {view === 'success' && (
            <div className="text-center py-6 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Todo listo!</h2>
              <p className="text-slate-500 text-sm mb-8">Tu PIN ha sido creado exitosamente. Ya puedes ingresar al portal.</p>
              <button 
                onClick={() => { setView('login'); setIsApoderado(true); setEmail(parentRut); }}
                className="btn-primary w-full py-3"
              >
                Ir al Login
              </button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Soporte</p>
            <p className="text-[11px] text-slate-400">
              Si tienes problemas, consulta en la secretaría de tu establecimiento.
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-8 font-bold uppercase tracking-wider">
          © {new Date().getFullYear()} Bloom Educational Systems
        </p>
      </div>
    </div>
  )
}
