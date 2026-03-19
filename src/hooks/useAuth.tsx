import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Perfil } from '@/lib/supabase'

interface AuthCtx {
  user: User | null
  session: Session | null
  perfil: Perfil | null
  loading: boolean        // true mientras resuelve si hay sesión
  perfilLoading: boolean  // true mientras carga el perfil de Supabase
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [perfilLoading, setPerfilLoading] = useState(true)

  const fetchControllerRef = useRef<AbortController | null>(null)

  async function fetchPerfil(userId: string) {
    fetchControllerRef.current?.abort()
    const controller = new AbortController()
    fetchControllerRef.current = controller

    setPerfilLoading(true)

    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single()
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return

      if (!error && data) setPerfil(data)
    } catch {
      // abort o error de red — no bloquea la UI
    } finally {
      if (!controller.signal.aborted) setPerfilLoading(false)
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchPerfil(session.user.id)
        } else {
          fetchControllerRef.current?.abort()
          setPerfil(null)
          setPerfilLoading(false)
        }

        setLoading(false)
      }
    )

    const fallback = setTimeout(() => {
      setLoading(false)
      setPerfilLoading(false)
    }, 5000)

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
    <AuthContext.Provider value={{ user, session, perfil, loading, perfilLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
