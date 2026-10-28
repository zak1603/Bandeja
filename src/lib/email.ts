import { supabase } from "@/lib/supabaseClient"

/**
 * Asks the serverless function (api/notify.ts) to email the admin about a booking
 * — and the player, if receipts are enabled. The Resend key lives only on the
 * server; the browser sends just the booking id and its own access token, and
 * the function re-reads the booking from Supabase as that user, so the payload
 * can't be forged.
 */
export async function sendBookingConfirmation(bookingId: string): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error("Not signed in")

  const res = await fetch("/api/notify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ kind: "booking", bookingId }),
  })

  // 503: email isn't set up on this deployment — optional, so not an error.
  if (res.status === 503) return
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(json?.error ?? `Email request failed (${res.status})`)
  }
}
