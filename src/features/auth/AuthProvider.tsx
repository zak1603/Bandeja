import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"
import { AuthContext, type AuthState } from "./auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recoveringPassword, setRecoveringPassword] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === "PASSWORD_RECOVERY") setRecoveringPassword(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      recoveringPassword,
      finishRecovery: () => setRecoveringPassword(false),
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [session, loading, recoveringPassword]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
