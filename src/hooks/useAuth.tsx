import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Perfil } from '@/lib/supabase'

interface AuthCtx {
  user: User | null
  session: Session | null
  perfil: Perfil | null
  loading: boolean
  perfilLoading: boolean
  selectedEstablecimientoId: string | null
  setSelectedEstablecimientoId: (id: string | null) => void
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null)
  const [session, setSession]             = useState<Session | null>(null)
  const [perfil, setPerfil]               = useState<Perfil | null>(null)
  const [loading, setLoading]             = useState(true)
  const [perfilLoading, setPerfilLoading] = useState(true)
  const [selectedEstablecimientoId, setSelectedEstablecimientoId] = useState<string | null>(null)

  const lastUserIdRef = useRef<string | null>(null)
  const perfilRef     = useRef<Perfil | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (!session?.user) {
          setPerfil(null)
          setSelectedEstablecimientoId(null)
          perfilRef.current = null
          lastUserIdRef.current = null
          setLoading(false)
          setPerfilLoading(false)
          return
        }

        // Si es el mismo usuario y ya tenemos perfil, no re-fetchear
        if (lastUserIdRef.current === session.user.id && perfilRef.current !== null) {
          setLoading(false)
          setPerfilLoading(false)
          return
        }

        lastUserIdRef.current = session.user.id
        setPerfilLoading(true)

        const { data, error } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!error && data) {
          setPerfil(data)
          perfilRef.current = data
          setSelectedEstablecimientoId(data.establecimiento_id)
        }

        setLoading(false)
        setPerfilLoading(false)
      }
    )

    // Timeout de seguridad
    const fallback = setTimeout(() => {
      setLoading(false)
      setPerfilLoading(false)
    }, 4000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
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
    <AuthContext.Provider value={{ user, session, perfil, loading, perfilLoading, selectedEstablecimientoId, setSelectedEstablecimientoId, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
