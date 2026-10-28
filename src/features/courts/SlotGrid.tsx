import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CLOSING_HOUR, OPENING_HOUR, SLOT_STEP_MINUTES } from "@/lib/club"
import { formatDuration, fromMinutes, toDateKey, toMinutes } from "@/lib/time"
import { useNow } from "@/lib/useNow"
import { cn } from "@/lib/utils"
import type { BookedSlot, Court } from "@/types"

export interface SlotSelection {
  court: Court
  start: string // HH:MM
}

interface SlotGridProps {
  court: Court
  booked: BookedSlot[]
  dateKey: string
  durationMinutes: number
  selection: SlotSelection | null
  onSelect: (selection: SlotSelection) => void
}

type SlotStatus =
  | { kind: "free"; end: string }
  | { kind: "past" }
  | { kind: "booked"; by: string | null } // the start time falls inside a booking
  | { kind: "clash"; at: string } // free to start, but runs into a later booking

const PERIODS = [
  { label: "Morning", from: 0, until: 12 * 60 },
  { label: "Afternoon", from: 12 * 60, until: 17 * 60 },
  { label: "Evening", from: 17 * 60, until: 24 * 60 },
]

/** Start times, every SLOT_STEP_MINUTES, where a booking of this length still ends by closing. */
function startTimes(durationMinutes: number): string[] {
  const times: string[] = []
  for (let m = OPENING_HOUR * 60; m + durationMinutes <= CLOSING_HOUR * 60; m += SLOT_STEP_MINUTES) {
    times.push(fromMinutes(m))
  }
  return times
}

export function SlotGrid({
  court,
  booked,
  dateKey,
  durationMinutes,
  selection,
  onSelect,
}: SlotGridProps) {
  const now = useNow()
  const isToday = dateKey === toDateKey(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const bookings = booked.filter((b) => b.court_id === court.id)
  const times = startTimes(durationMinutes)

  function statusOf(start: string): SlotStatus {
    const s = toMinutes(start)
    const e = s + durationMinutes
    if (isToday && s <= nowMinutes) return { kind: "past" }
    const covering = bookings.find((b) => toMinutes(b.start_time) <= s && s < toMinutes(b.end_time))
    if (covering) return { kind: "booked", by: covering.booked_by }
    const clash = bookings.find((b) => s < toMinutes(b.end_time) && e > toMinutes(b.start_time))
    if (clash) return { kind: "clash", at: clash.start_time }
    return { kind: "free", end: fromMinutes(e) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{court.name}</CardTitle>
        <CardDescription>
          Start times every {SLOT_STEP_MINUTES} minutes, {fromMinutes(OPENING_HOUR * 60)}–
          {fromMinutes(CLOSING_HOUR * 60)}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <DayBookings bookings={bookings} />
        {PERIODS.map((period) => {
          const periodTimes = times.filter((t) => toMinutes(t) >= period.from && toMinutes(t) < period.until)
          if (periodTimes.length === 0) return null
          return (
            <section key={period.label} className="grid gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {period.label}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {periodTimes.map((time) => (
                  <SlotButton
                    key={time}
                    time={time}
                    status={statusOf(time)}
                    selected={selection?.court.id === court.id && selection.start === time}
                    onSelect={() => onSelect({ court, start: time })}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </CardContent>
    </Card>
  )
}

function slotLabel(status: SlotStatus): string {
  switch (status.kind) {
    case "free":
      return `until ${status.end}`
    case "past":
      return "Past"
    case "booked":
      return status.by ? `Booked · ${status.by}` : "Booked"
    case "clash":
      return `Clashes with ${status.at}`
  }
}

function SlotButton({
  time,
  status,
  selected,
  onSelect,
}: {
  time: string
  status: SlotStatus
  selected: boolean
  onSelect: () => void
}) {
  const free = status.kind === "free"
  const label = slotLabel(status)
  return (
    <button
      type="button"
      disabled={!free}
      aria-pressed={selected}
      aria-label={`${time}, ${label}`}
      onClick={onSelect}
      className={cn(
        "flex min-w-0 flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        free && !selected && "hover:border-primary hover:bg-muted",
        selected && "padel-pop border-primary bg-primary text-primary-foreground",
        status.kind === "booked" && "cursor-not-allowed border-transparent bg-muted text-muted-foreground",
        (status.kind === "clash" || status.kind === "past") &&
          "cursor-not-allowed border-dashed text-muted-foreground opacity-60"
      )}
    >
      <span className={cn("text-base font-semibold tabular-nums", status.kind === "booked" && "line-through")}>
        {time}
      </span>
      <span
        className={cn("max-w-full truncate text-xs", selected ? "text-primary-foreground/80" : "text-muted-foreground")}
      >
        {label}
      </span>
    </button>
  )
}

/** Who has the court and for how long, on the selected day. */
function DayBookings({ bookings }: { bookings: BookedSlot[] }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No bookings yet on this day. The court is all yours.</p>
  }

  return (
    <section className="grid gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Booked on this day</h3>
      <ul className="grid gap-1.5 text-sm">
        {bookings.map((b, i) => (
          <li
            key={b.start_time}
            style={{ animationDelay: `${i * 60}ms` }}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md bg-muted px-3 py-2 [animation-fill-mode:both] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2"
          >
            <span className="font-medium tabular-nums">
              {b.start_time}–{b.end_time}
              <span className="ml-2 font-normal text-muted-foreground">
                {formatDuration(toMinutes(b.end_time) - toMinutes(b.start_time))}
              </span>
            </span>
            <span className={b.booked_by ? "font-medium" : "text-muted-foreground"}>
              {b.booked_by ?? "Booked"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
