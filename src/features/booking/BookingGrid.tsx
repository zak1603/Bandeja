import { useCallback, useState } from "react"
import { addDays, startOfToday } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { playerName, useAuth } from "@/features/auth/auth-context"
import { CourtPicker } from "@/features/courts/CourtPicker"
import { SlotGrid, type SlotSelection } from "@/features/courts/SlotGrid"
import { useBookedSlots, useCourts } from "@/features/courts/useCourts"
import { BookingCelebration } from "@/features/padel/BookingCelebration"
import { BallLoader } from "@/features/padel/PadelBall"
import { BOOKING_WINDOW_DAYS, DURATIONS, type Duration } from "@/lib/club"
import { sendBookingConfirmation } from "@/lib/email"
import { describeBookingError } from "@/lib/errors"
import { supabase } from "@/lib/supabaseClient"
import { formatDateLong, formatDuration, fromMinutes, toDateKey, toMinutes } from "@/lib/time"
import type { Court } from "@/types"
import { BookingConfirmDialog, type BookingSummary } from "./BookingConfirmDialog"
import { GuestDetailsDialog } from "./GuestDetailsDialog"

interface BookingGridProps {
  onBooked?: () => void
}

export function BookingGrid({ onBooked }: BookingGridProps) {
  const { user } = useAuth()
  const today = startOfToday()

  const [courtId, setCourtId] = useState<string | null>(null)
  const [date, setDate] = useState<Date>(today)
  const [duration, setDuration] = useState<Duration>(90)
  const [selection, setSelection] = useState<SlotSelection | null>(null)
  const [confirming, setConfirming] = useState<BookingSummary | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [guestOpen, setGuestOpen] = useState(false)
  const [celebration, setCelebration] = useState<{ id: number; detail: string } | null>(null)
  const endCelebration = useCallback(() => setCelebration(null), [])

  const dateKey = toDateKey(date)
  const { courts, loading: courtsLoading, error: courtsError } = useCourts()
  const { booked, loading: slotsLoading, error: slotsError, refresh } = useBookedSlots(dateKey)
  // Until someone picks, default to the first court (there is usually just one).
  const court = courts.find((c) => c.id === courtId) ?? courts[0] ?? null

  const summary: BookingSummary | null = selection && {
    courtName: selection.court.name,
    dateKey,
    start: selection.start,
    end: fromMinutes(toMinutes(selection.start) + duration),
    durationMinutes: duration,
  }

  function changeCourt(next: Court) {
    setCourtId(next.id)
    setSelection(null)
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

  // Booked on this device before: confirm first. First time: entering a name
  // *is* the confirmation — the guest dialog books straight away.
  function reserve() {
    if (!summary) return
    if (!user) {
      setGuestOpen(true)
      return
    }
    setConfirming(summary)
  }

  async function book(courtId: string, target: BookingSummary) {
    setSubmitting(true)

    // user_id and status are set by the prepare_booking trigger.
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        court_id: courtId,
        booking_date: target.dateKey,
        start_time: target.start,
        end_time: target.end,
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

    toast.success(`Booked ${target.courtName} at ${target.start}`, {
      description: formatDateLong(target.dateKey),
    })
    setCelebration({
      id: Date.now(),
      detail: `${target.courtName} · ${formatDateLong(target.dateKey)} · ${target.start}–${target.end}`,
    })
    setConfirming(null)
    setSelection(null)
    refresh()
    onBooked?.()

    // The slot is already locked; an email failure must not undo the booking.
    sendBookingConfirmation(data.id).catch((err: unknown) => {
      console.error(err)
      toast.warning("Your court is booked, but the notification email couldn't be sent.")
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
      <div className="grid content-start gap-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>1. Choose a court</CardTitle>
          </CardHeader>
          <CardContent>
            {courtsError ? (
              <p className="text-sm text-destructive">{courtsError}</p>
            ) : courtsLoading ? (
              <BallLoader label="Loading courts…" />
            ) : (
              <CourtPicker courts={courts} selectedId={court?.id ?? null} onSelect={changeCourt} />
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>2. Pick a date</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Full-width with bigger day cells; "!" beats the component's own w-fit / cell size. */}
            <Calendar
              mode="single"
              selected={date}
              onSelect={changeDate}
              disabled={[{ before: today }, { after: addDays(today, BOOKING_WINDOW_DAYS) }]}
              className="w-full! [--cell-size:--spacing(11)]!"
              classNames={{ day_button: "text-base!" }}
            />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle>3. Match length</CardTitle>
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
          <h2 className="text-lg font-semibold">4. Choose a time</h2>
          <p className="text-sm text-muted-foreground">{formatDateLong(dateKey)}</p>
        </div>

        {courtsError || slotsError ? (
          <p className="text-sm text-destructive">
            Couldn't load availability: {courtsError ?? slotsError}
          </p>
        ) : courtsLoading ? (
          <BallLoader label="Loading the court…" />
        ) : !court ? (
          <p className="text-sm text-muted-foreground">Choose a court to see its times.</p>
        ) : (
          <div className={slotsLoading ? "pointer-events-none opacity-60" : undefined}>
            <SlotGrid
              court={court}
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
                <p className="text-muted-foreground">{formatDuration(duration)}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a free time slot.</p>
            )}
            <Button size="lg" disabled={!summary} onClick={reserve}>
              Reserve Court
            </Button>
          </CardContent>
        </Card>
      </div>

      <BookingConfirmDialog
        summary={confirming}
        bookingAs={user ? playerName(user) : null}
        submitting={submitting}
        onConfirm={() => selection && confirming && book(selection.court.id, confirming)}
        onOpenChange={(open) => !open && !submitting && setConfirming(null)}
      />

      <GuestDetailsDialog
        open={guestOpen}
        summary={summary}
        onOpenChange={setGuestOpen}
        onReady={() => selection && summary && book(selection.court.id, summary)}
      />

      {celebration && (
        <BookingCelebration
          key={celebration.id}
          title="Game on!"
          detail={celebration.detail}
          onDone={endCelebration}
        />
      )}
    </div>
  )
}
