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
    let initialized = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event, !!session)
        
        setSession(session)
        setUser(session?.user ?? null)

        if (!session?.user) {
          setPerfil(null)
          perfilRef.current = null
          lastUserIdRef.current = null
          setSelectedEstablecimientoId(null)
          setPerfilLoading(false)
          setLoading(false)
          initialized = true
          return
        }

        // Fetch profile if needed
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || lastUserIdRef.current !== session.user.id) {
          console.log("Fetching profile for user:", session.user.id)
          lastUserIdRef.current = session.user.id
          setPerfilLoading(true)

          try {
            console.log("Starting profile fetch with 8s timeout...")
            
            // Usamos Promise.race para evitar bloqueos infinitos
            const { data, error } = await Promise.race([
              supabase.from('perfiles').select('*').eq('id', session.user.id).single(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de consulta (8s)")), 8000))
            ]) as any

            if (error) {
               console.warn("Profile fetch error:", error)
               setPerfil(null)
               perfilRef.current = null
            } else if (data) {
              console.log("Profile loaded successfully:", data.rol)
              setPerfil(data)
              perfilRef.current = data
              setSelectedEstablecimientoId(data.establecimiento_id)
            } else {
              console.warn("No profile data found")
              setPerfil(null)
              perfilRef.current = null
            }
          } catch (e: any) {
            console.error("Critical Profile Error or Timeout:", e.message || e)
            setPerfil(null)
          } finally {
            console.log("Finishing auth initialization states")
            setPerfilLoading(false)
            setLoading(false)
            initialized = true
          }
        } else {
          console.log("No profile fetch needed for this event")
          setLoading(false)
          setPerfilLoading(false)
          initialized = true
        }
      }
    )

    // Safety fallback
    const fallback = setTimeout(() => {
      if (!initialized) {
        console.warn("Auth initializing fallback triggered")
        setLoading(false)
        setPerfilLoading(false)
      }
    }, 5000)

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
    try {
      await supabase.auth.signOut()
    } finally {
      // Proactive local state clearing
      setSession(null)
      setUser(null)
      setPerfil(null)
      setSelectedEstablecimientoId(null)
      perfilRef.current = null
      lastUserIdRef.current = null
    }
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
