import { createContext, useContext } from "react"
import type { Session, User } from "@supabase/supabase-js"

export interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}

/** The name a guest gave when they first booked (anonymous users have no email). */
export function playerName(user: User): string {
  const name = (user.user_metadata.full_name as string | undefined)?.trim()
  return name || user.email || "Guest"
}
