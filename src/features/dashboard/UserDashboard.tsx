import { useCallback, useEffect, useState } from "react"
import { CalendarDays, Clock } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/features/auth/auth-context"
import { BallLoader } from "@/features/padel/PadelBall"
import { supabase } from "@/lib/supabaseClient"
import { formatDateLong, formatDuration, toHHMM, toLocalDateTime, toMinutes } from "@/lib/time"
import { useNow } from "@/lib/useNow"
import type { BookingStatus, BookingWithCourt } from "@/types"

interface BookingsResult {
  key: string
  bookings: BookingWithCourt[]
  error: string | null
}

interface UserDashboardProps {
  onBookCourt: () => void
}

export function UserDashboard({ onBookCourt }: UserDashboardProps) {
  const { user } = useAuth()
  const userId = user?.id
  const now = useNow()
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<BookingsResult | null>(null)
  const [cancelTarget, setCancelTarget] = useState<BookingWithCourt | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const requestKey = `${userId}#${version}`
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    // RLS already limits this to the user's rows; the filter keeps intent explicit.
    supabase
      .from("bookings")
      .select("*, courts(name)")
      .eq("user_id", userId)
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        setResult({
          key: requestKey,
          error: error?.message ?? null,
          bookings: ((data ?? []) as BookingWithCourt[]).map((b) => ({
            ...b,
            start_time: toHHMM(b.start_time),
            end_time: toHHMM(b.end_time),
          })),
        })
      })
    return () => {
      cancelled = true
    }
  }, [userId, requestKey])

  const bookings = result?.bookings ?? []
  const error = result?.error ?? null
  // Only show the spinner on first load; refreshes keep the old list visible.
  const loading = result === null

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", cancelTarget.id)
    setCancelling(false)

    if (error) {
      toast.error(`Couldn't cancel: ${error.message}`)
    } else {
      toast.success("Booking cancelled — the slot is free for others again.")
      setCancelTarget(null)
      reload()
    }
  }

  if (!user) return null

  const isUpcoming = (b: BookingWithCourt) =>
    b.status === "confirmed" && toLocalDateTime(b.booking_date, b.end_time) > now
  const upcoming = bookings.filter(isUpcoming)
  const past = bookings.filter((b) => !isUpcoming(b)).reverse()

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">Upcoming matches</h2>
        {loading ? (
          <BallLoader label="Loading your bookings…" />
        ) : error ? (
          <p className="text-sm text-destructive">Couldn't load bookings: {error}</p>
        ) : upcoming.length === 0 ? (
          <Card size="sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">No upcoming matches. Time to get on court?</p>
              <Button onClick={onBookCourt}>Book a court</Button>
            </CardContent>
          </Card>
        ) : (
          upcoming.map((b) => (
            <BookingCard key={b.id} booking={b} status="confirmed" onCancel={() => setCancelTarget(b)} />
          ))
        )}
      </section>

      {!loading && !error && past.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Past & cancelled</h2>
          {past.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              // A confirmed booking whose time has passed has been played.
              status={b.status === "confirmed" ? "completed" : b.status}
            />
          ))}
        </section>
      )}

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && !cancelling && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              {cancelTarget &&
                `${cancelTarget.courts?.name ?? "Court"} on ${formatDateLong(cancelTarget.booking_date)}, ${cancelTarget.start_time}–${cancelTarget.end_time}. The slot will be released to other players.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              Keep booking
            </Button>
            <Button variant="destructive" onClick={confirmCancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const STATUS_BADGE: Record<BookingStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  confirmed: { label: "Confirmed", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

function BookingCard({
  booking,
  status,
  onCancel,
}: {
  booking: BookingWithCourt
  status: BookingStatus
  onCancel?: () => void
}) {
  const badge = STATUS_BADGE[status]
  return (
    <Card size="sm" className={status === "cancelled" ? "opacity-70" : undefined}>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-medium">{booking.courts?.name ?? "Court"}</span>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden />
              {formatDateLong(booking.booking_date)}
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Clock className="size-4" aria-hidden />
              {booking.start_time}–{booking.end_time}
            </span>
            <span>{formatDuration(toMinutes(booking.end_time) - toMinutes(booking.start_time))}</span>
          </div>
        </div>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel Booking
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
