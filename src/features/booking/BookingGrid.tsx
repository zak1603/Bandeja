import { useState } from "react"
import { addDays, startOfToday } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthModal } from "@/features/auth/AuthModal"
import { useAuth } from "@/features/auth/auth-context"
import { SlotGrid, type SlotSelection } from "@/features/courts/SlotGrid"
import { useBookedSlots, useCourts } from "@/features/courts/useCourts"
import { BOOKING_WINDOW_DAYS, DURATIONS, formatPrice, type Duration } from "@/lib/club"
import { sendBookingConfirmation } from "@/lib/email"
import { describeBookingError } from "@/lib/errors"
import { supabase } from "@/lib/supabaseClient"
import { formatDateLong, formatDuration, fromMinutes, toDateKey, toMinutes } from "@/lib/time"
import { BookingConfirmDialog, type BookingSummary } from "./BookingConfirmDialog"

interface BookingGridProps {
  onBooked?: () => void
}

export function BookingGrid({ onBooked }: BookingGridProps) {
  const { user } = useAuth()
  const today = startOfToday()

  const [date, setDate] = useState<Date>(today)
  const [duration, setDuration] = useState<Duration>(90)
  const [selection, setSelection] = useState<SlotSelection | null>(null)
  const [confirming, setConfirming] = useState<BookingSummary | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const dateKey = toDateKey(date)
  const { courts, loading: courtsLoading, error: courtsError } = useCourts()
  const { booked, loading: slotsLoading, error: slotsError, refresh } = useBookedSlots(dateKey)

  const summary: BookingSummary | null = selection && {
    courtName: selection.court.name,
    dateKey,
    start: selection.start,
    end: fromMinutes(toMinutes(selection.start) + duration),
    durationMinutes: duration,
    price: (selection.court.hourly_rate * duration) / 60,
  }

  function changeDate(next: Date | undefined) {
    if (!next) return
    setDate(next)
    setSelection(null)
  }

  function changeDuration(next: Duration) {
    setDuration(next)
    setSelection(null) // a longer booking may no longer fit the chosen slot
  }

  function reserve() {
    if (!summary) return
    if (!user) {
      setAuthOpen(true)
      return
    }
    setConfirming(summary)
  }

  async function confirmBooking() {
    if (!selection || !confirming) return
    setSubmitting(true)

    // user_id, status and total_price are set by the prepare_booking trigger.
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        court_id: selection.court.id,
        booking_date: confirming.dateKey,
        start_time: confirming.start,
        end_time: confirming.end,
      })
      .select("id")
      .single()

    setSubmitting(false)

    if (error) {
      toast.error(describeBookingError(error))
      setConfirming(null)
      setSelection(null)
      refresh()
      return
    }

    toast.success(`Booked ${confirming.courtName} at ${confirming.start}`, {
      description: formatDateLong(confirming.dateKey),
    })
    setConfirming(null)
    setSelection(null)
    refresh()
    onBooked?.()

    // The slot is already locked; an email failure must not undo the booking.
    sendBookingConfirmation(data.id).catch((err: unknown) => {
      console.error(err)
      toast.warning("Your court is booked, but we couldn't send the confirmation email.")
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div className="grid content-start gap-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>1. Pick a date</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={changeDate}
              disabled={[{ before: today }, { after: addDays(today, BOOKING_WINDOW_DAYS) }]}
            />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>2. Match length</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            {DURATIONS.map((d) => (
              <Button
                key={d}
                variant={d === duration ? "default" : "outline"}
                aria-pressed={d === duration}
                onClick={() => changeDuration(d)}
                className="flex-1"
              >
                {formatDuration(d)}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">3. Choose a court & time</h2>
          <p className="text-sm text-muted-foreground">{formatDateLong(dateKey)}</p>
        </div>

        {courtsError || slotsError ? (
          <p className="text-sm text-destructive">
            Couldn't load availability: {courtsError ?? slotsError}
          </p>
        ) : courtsLoading ? (
          <p className="text-sm text-muted-foreground">Loading courts…</p>
        ) : (
          <div className={slotsLoading ? "pointer-events-none opacity-60" : undefined}>
            <SlotGrid
              courts={courts}
              booked={booked}
              dateKey={dateKey}
              durationMinutes={duration}
              selection={selection}
              onSelect={setSelection}
            />
          </div>
        )}

        <Card size="sm" className="sticky bottom-4 shadow-lg">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            {summary ? (
              <div className="text-sm">
                <p className="font-medium">
                  {summary.courtName} · {summary.start}–{summary.end}
                </p>
                <p className="text-muted-foreground">
                  {formatDuration(duration)} · {formatPrice(summary.price)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a time slot to see the price.</p>
            )}
            <Button size="lg" disabled={!summary} onClick={reserve}>
              Reserve Court
            </Button>
          </CardContent>
        </Card>
      </div>

      <BookingConfirmDialog
        summary={confirming}
        submitting={submitting}
        onConfirm={confirmBooking}
        onOpenChange={(open) => !open && !submitting && setConfirming(null)}
      />

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthenticated={() => summary && setConfirming(summary)}
      />
    </div>
  )
}
