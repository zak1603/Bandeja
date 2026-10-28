import { useState, type FormEvent } from "react"
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
import { formatDateLong } from "@/lib/time"
import type { BookingSummary } from "./BookingConfirmDialog"

interface GuestDetailsDialogProps {
  open: boolean
  summary: BookingSummary | null
  onOpenChange: (open: boolean) => void
  /** Called once there's a guest session carrying the player's name. */
  onReady: () => void
}

/**
 * First booking on a device: ask for a name and phone, no email or password.
 * Signs in as a Supabase anonymous (guest) user, which Supabase remembers on
 * this device — so the same person can see and cancel their bookings later.
 */
export function GuestDetailsDialog({ open, summary, onOpenChange, onReady }: GuestDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Mounted only while open, so every opening starts with a fresh form. */}
        {open && summary && (
          <GuestForm
            summary={summary}
            onReady={() => {
              onOpenChange(false)
              onReady()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function GuestForm({ summary, onReady }: { summary: BookingSummary; onReady: () => void }) {
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // full_name / phone_number go into user metadata; the handle_new_user
    // trigger in schema.sql copies them into public.profiles.
    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { full_name: fullName.trim(), phone_number: phone.trim() } },
    })

    setSubmitting(false)
    if (error) {
      setError(
        error.code === "anonymous_provider_disabled"
          ? "Guest booking isn't switched on yet. Turn on \"Allow anonymous sign-ins\" in Supabase."
          : error.message
      )
      return
    }
    onReady()
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Who's playing?</DialogTitle>
        <DialogDescription>
          Your name shows on the schedule so everyone knows the court is taken. No account or password needed.
        </DialogDescription>
      </DialogHeader>

      <p className="rounded-md bg-muted px-3 py-2 text-sm">
        <span className="font-medium">{summary.courtName}</span> · {formatDateLong(summary.dateKey)} ·{" "}
        <span className="tabular-nums">
          {summary.start}–{summary.end}
        </span>
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="guest-name">Your name</Label>
          <Input
            id="guest-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="guest-phone">Phone number</Label>
          <Input
            id="guest-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting || !fullName.trim()} className="w-full">
          {submitting ? "Booking…" : "Book court"}
        </Button>
      </form>
    </>
  )
}
