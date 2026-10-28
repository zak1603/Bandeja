import { createContext, useContext } from "react"
import type { Session, User } from "@supabase/supabase-js"

export interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  /** True after the user follows a password-reset email link. */
  recoveringPassword: boolean
  finishRecovery: () => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
