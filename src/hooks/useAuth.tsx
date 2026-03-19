import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Perfil } from '@/lib/supabase'

interface AuthCtx {
  user: User | null
  session: Session | null
  perfil: Perfil | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil]   = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  // Evita que fetchPerfil de un evento anterior pise al de uno más reciente
  const fetchControllerRef = useRef<AbortController | null>(null)

  async function fetchPerfil(userId: string) {
    // Cancela cualquier fetch previo en vuelo
    fetchControllerRef.current?.abort()
    const controller = new AbortController()
    fetchControllerRef.current = controller

    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal)

      // Si fue abortado, ignorar
      if (controller.signal.aborted) return

      if (!error) setPerfil(data)
    } catch {
      // Ignorar errores de abort o red — no bloquean la UI
    }
  }

  useEffect(() => {
    // ✅ SOLO onAuthStateChange — no getSession() por separado.
    // onAuthStateChange dispara INITIAL_SESSION al montar,
    // que equivale exactamente a getSession() pero sin race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // No esperamos fetchPerfil para quitar el spinner —
          // loading se levanta con el usuario ya resuelto.
          fetchPerfil(session.user.id)
        } else {
          fetchControllerRef.current?.abort()
          setPerfil(null)
        }

        // loading se resuelve en cuanto sabemos si hay sesión o no,
        // sin depender de que fetchPerfil termine.
        setLoading(false)
      }
    )

    // Fallback de seguridad: si onAuthStateChange nunca dispara
    // (timeout de red, etc.), salimos del spinner a los 5 segundos.
    const fallback = setTimeout(() => setLoading(false), 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
      fetchControllerRef.current?.abort()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, perfil, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
