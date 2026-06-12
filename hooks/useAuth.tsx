'use client'

import { createContext, useContext, useState, useEffect, useRef, useMemo, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: any | null
  role: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<any | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const resolvedRef = useRef(false)

  const contextValue = useMemo(
    () => ({ user, role, isAuthenticated: !!user, isLoading }),
    [user, role, isLoading],
  )

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        resolvedRef.current = true
        setUser(session.user)
        setRole(session.user?.user_metadata?.role ?? null)
      } else if (event === 'SIGNED_OUT') {
        resolvedRef.current = false
        setUser(null)
        setRole(null)
      }
      setIsLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (resolvedRef.current) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        resolvedRef.current = true
        setUser(session.user)
        setRole(session.user?.user_metadata?.role ?? null)
      }
      setIsLoading(false)
    })
  }, [pathname])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
