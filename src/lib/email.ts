import { supabase } from "@/lib/supabaseClient"

/**
 * Asks the serverless function to email the booking receipt to the client and
 * the club admin. The Resend key lives only on the server (api/send-confirmation.ts);
 * the browser sends just the booking id and its own access token, and the
 * function re-reads the booking from Supabase so the payload can't be forged.
 */
export async function sendBookingConfirmation(bookingId: string): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error("Not signed in")

  const res = await fetch("/api/send-confirmation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ bookingId }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Email request failed (${res.status})`)
  }
}
