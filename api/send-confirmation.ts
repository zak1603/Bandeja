/**
 * Vercel Serverless Function — POST /api/send-confirmation
 *
 * Body:    { "bookingId": "<uuid>" }
 * Headers: Authorization: Bearer <supabase access token>
 *
 * Sends two emails through Resend: a receipt to the player and an alert to the
 * club admin. The booking is re-read from Supabase *as the calling user* (RLS
 * applies), so a caller can only trigger emails for their own bookings and the
 * email contents never come from the request body.
 *
 * Env (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY, ADMIN_NOTIFICATION_EMAIL           required
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY          required (shared with the frontend)
 *   RESEND_FROM_EMAIL                                  optional, e.g. "Bandeja <bookings@yourdomain.com>"
 *   CLUB_NAME, CLUB_ADDRESS                            optional, shown in the emails
 */
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

interface BookingRow {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  total_price: number | string
  status: string
  courts: { name: string } | null
  profiles: { full_name: string; phone_number: string } | null
}

const CURRENCY = "EUR"

export async function POST(request: Request): Promise<Response> {
  const env = readEnv()
  if (!env) return json(500, { error: "Email service is not configured" })

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return json(401, { error: "Missing access token" })

  let bookingId: unknown
  try {
    ;({ bookingId } = (await request.json()) as { bookingId?: unknown })
  } catch {
    return json(400, { error: "Invalid JSON body" })
  }
  if (typeof bookingId !== "string" || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
    return json(400, { error: "bookingId must be a UUID" })
  }

  // Acts as the signed-in user, so RLS limits it to their own rows.
  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  const email = userData.user?.email
  if (userError || !email) return json(401, { error: "Invalid or expired session" })

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, booking_date, start_time, end_time, total_price, status, courts(name), profiles(full_name, phone_number)"
    )
    .eq("id", bookingId)
    .maybeSingle<BookingRow>()

  if (bookingError) return json(500, { error: "Could not load booking" })
  if (!booking) return json(404, { error: "Booking not found" })
  if (booking.status !== "confirmed") return json(409, { error: "Booking is not confirmed" })

  const details = toDetails(booking, env)
  const resend = new Resend(env.resendApiKey)

  const { error: sendError } = await resend.batch.send([
    {
      from: env.fromEmail,
      to: [email],
      subject: `Court booked: ${details.court}, ${details.date} at ${details.start}`,
      html: clientEmail(details),
    },
    {
      from: env.fromEmail,
      to: [env.adminEmail],
      replyTo: email,
      subject: `New booking: ${details.court}, ${details.date} ${details.start}–${details.end}`,
      html: adminEmail(details, email),
    },
  ])

  if (sendError) {
    console.error("Resend error", sendError)
    return json(502, { error: "Failed to send confirmation emails" })
  }
  return json(200, { ok: true })
}

// ---------------------------------------------------------------------------

function readEnv() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  if (!supabaseUrl || !supabaseAnonKey || !resendApiKey || !adminEmail) {
    console.error("send-confirmation: missing required environment variables")
    return null
  }
  return {
    supabaseUrl,
    supabaseAnonKey,
    resendApiKey,
    adminEmail,
    // onboarding@resend.dev works without a verified domain, but only delivers
    // to the Resend account owner's address. Verify a domain for production.
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "Bandeja Padel <onboarding@resend.dev>",
    clubName: process.env.CLUB_NAME ?? "Bandeja Padel Club",
    clubAddress: process.env.CLUB_ADDRESS ?? "Ask the club for directions",
  }
}

type Env = NonNullable<ReturnType<typeof readEnv>>

interface Details {
  ref: string
  court: string
  date: string
  start: string
  end: string
  price: string
  playerName: string
  playerPhone: string
  clubName: string
  clubAddress: string
}

function toDetails(b: BookingRow, env: Env): Details {
  const [y, m, d] = b.booking_date.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
  return {
    ref: b.id.slice(0, 8).toUpperCase(),
    court: b.courts?.name ?? "Court",
    date,
    start: b.start_time.slice(0, 5),
    end: b.end_time.slice(0, 5),
    price: new Intl.NumberFormat("en-GB", { style: "currency", currency: CURRENCY }).format(
      Number(b.total_price)
    ),
    playerName: b.profiles?.full_name || "Player",
    playerPhone: b.profiles?.phone_number || "—",
    clubName: env.clubName,
    clubAddress: env.clubAddress,
  }
}

function clientEmail(d: Details): string {
  return layout(
    d.clubName,
    `<h1 style="margin:0 0 8px;font-size:22px;">You're on court, ${esc(d.playerName)}!</h1>
     <p style="margin:0 0 24px;color:#52525b;">Your padel match is confirmed. See you there.</p>
     ${table([
       ["Court", d.court],
       ["Date", d.date],
       ["Time", `${d.start} – ${d.end}`],
       ["Total", d.price],
       ["Location", `${d.clubName}, ${d.clubAddress}`],
       ["Reference", d.ref],
     ])}
     <p style="margin:24px 0 0;color:#52525b;font-size:13px;">
       Need to cancel? Open <strong>My bookings</strong> in the Bandeja app.
     </p>`
  )
}

function adminEmail(d: Details, playerEmail: string): string {
  return layout(
    d.clubName,
    `<h1 style="margin:0 0 8px;font-size:22px;">New court booking</h1>
     <p style="margin:0 0 24px;color:#52525b;">A slot has just been reserved.</p>
     ${table([
       ["Court", d.court],
       ["Date", d.date],
       ["Time", `${d.start} – ${d.end}`],
       ["Total", d.price],
       ["Player", d.playerName],
       ["Email", playerEmail],
       ["Phone", d.playerPhone],
       ["Reference", d.ref],
     ])}`
  )
}

function layout(clubName: string, body: string): string {
  return `<!doctype html>
<html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#14532d;color:#ffffff;padding:20px 28px;font-size:18px;font-weight:700;letter-spacing:.5px;">
          🎾 ${esc(clubName)}
        </td></tr>
        <tr><td style="padding:28px;">${body}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function table(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px;">
    ${rows
      .map(
        ([k, v]) => `<tr>
          <td style="padding:8px 0;color:#71717a;width:110px;vertical-align:top;">${esc(k)}</td>
          <td style="padding:8px 0;font-weight:600;">${esc(v)}</td>
        </tr>`
      )
      .join("")}
  </table>`
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function json(status: number, body: unknown): Response {
  return Response.json(body, { status })
}
