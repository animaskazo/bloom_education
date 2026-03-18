import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchPerfil(userId: string) {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.error('❌ Supabase Error fetching perfil:', error.message, error.details, error.hint)
      } else {
        console.log('✅ Perfil fetch success:', data)
      }
      setPerfil(data)
    } catch (err) {
      console.error('Unexpected error fetching perfil:', err)
    }
  }

  useEffect(() => {
    // 1. Verificar sesión inicial
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchPerfil(session.user.id)
        }
      } catch (err) {
        console.error('Init Auth Error:', err)
      } finally {
        setLoading(false) // Siempre desactivamos el cargando al final
      }
    }

    initAuth()

    // 2. Escuchar cambios de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      if (newSession?.user) {
        await fetchPerfil(newSession.user.id)
      } else {
        setPerfil(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setPerfil(null)
    setUser(null)
    setSession(null)
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
