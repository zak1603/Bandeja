import { useState, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabaseClient"

export type AuthMode = "signin" | "signup" | "forgot" | "reset"

const COPY: Record<AuthMode, { title: string; description: string; submit: string }> = {
  signin: {
    title: "Welcome back",
    description: "Sign in to reserve a court and see your matches.",
    submit: "Sign in",
  },
  signup: {
    title: "Create your account",
    description: "Join Bandeja to book courts in seconds.",
    submit: "Create account",
  },
  forgot: {
    title: "Reset your password",
    description: "We'll email you a link to choose a new password.",
    submit: "Send reset link",
  },
  reset: {
    title: "Choose a new password",
    description: "Enter a new password for your account.",
    submit: "Update password",
  },
}

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: AuthMode
  /** Called after a successful sign-in, sign-up with session, or password reset. */
  onAuthenticated?: () => void
}

export function AuthModal({ open, onOpenChange, ...formProps }: AuthModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Mounted only while open, so every opening starts with a fresh form. */}
        {open && <AuthForm {...formProps} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function AuthForm({
  initialMode = "signin",
  onAuthenticated,
  onDone,
}: Omit<AuthModalProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const copy = COPY[mode]

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success("Signed in")
        onAuthenticated?.()
        onDone()
      } else if (mode === "signup") {
        // full_name / phone_number go into user metadata; the handle_new_user
        // trigger in schema.sql copies them into public.profiles.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim(), phone_number: phone.trim() },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error
        if (data.session) {
          toast.success("Account created — you're signed in")
          onAuthenticated?.()
        } else {
          toast.success("Check your inbox to confirm your email, then sign in.")
        }
        onDone()
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        toast.success("If that email has an account, a reset link is on its way.")
        onDone()
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        toast.success("Password updated")
        onAuthenticated?.()
        onDone()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {mode === "signup" && (
            <>
              <Field id="full-name" label="Full name">
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </Field>
              <Field id="phone" label="Phone number">
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  required
                />
              </Field>
            </>
          )}

          {mode !== "reset" && (
            <Field id="email" label="Email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </Field>
          )}

          {mode !== "forgot" && (
            <Field id="password" label={mode === "reset" ? "New password" : "Password"}>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
            </Field>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Please wait…" : copy.submit}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
          {mode === "signin" && (
            <>
              <ModeLink onClick={() => setMode("forgot")}>Forgot your password?</ModeLink>
              <span>
                New here? <ModeLink onClick={() => setMode("signup")}>Create an account</ModeLink>
              </span>
            </>
          )}
          {(mode === "signup" || mode === "forgot") && (
            <span>
              Already have an account?{" "}
              <ModeLink onClick={() => setMode("signin")}>Sign in</ModeLink>
            </span>
          )}
        </div>
    </>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function ModeLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-medium text-foreground underline-offset-4 hover:underline"
    >
      {children}
    </button>
  )
}
