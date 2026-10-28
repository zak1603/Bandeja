import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CLOSING_HOUR, OPENING_HOUR, formatPrice } from "@/lib/club"
import { fromMinutes, toDateKey, toMinutes } from "@/lib/time"
import { useNow } from "@/lib/useNow"
import { cn } from "@/lib/utils"
import type { BookedSlot, Court } from "@/types"

export interface SlotSelection {
  court: Court
  start: string // HH:MM
}

interface SlotGridProps {
  courts: Court[]
  booked: BookedSlot[]
  dateKey: string
  durationMinutes: number
  selection: SlotSelection | null
  onSelect: (selection: SlotSelection) => void
}

/** Hourly start times where a booking of this length still ends by closing. */
function startTimes(durationMinutes: number): string[] {
  const times: string[] = []
  for (let m = OPENING_HOUR * 60; m + durationMinutes <= CLOSING_HOUR * 60; m += 60) {
    times.push(fromMinutes(m))
  }
  return times
}

export function SlotGrid({
  courts,
  booked,
  dateKey,
  durationMinutes,
  selection,
  onSelect,
}: SlotGridProps) {
  const times = startTimes(durationMinutes)
  const now = useNow()
  const isToday = dateKey === toDateKey(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  function isAvailable(courtId: string, start: string): boolean {
    const s = toMinutes(start)
    const e = s + durationMinutes
    if (isToday && s <= nowMinutes) return false
    return !booked.some(
      (b) => b.court_id === courtId && s < toMinutes(b.end_time) && e > toMinutes(b.start_time)
    )
  }

  if (courts.length === 0) {
    return <p className="text-sm text-muted-foreground">No courts are open for booking right now.</p>
  }

  return (
    <div className="grid gap-4">
      {courts.map((court) => (
        <Card key={court.id} size="sm">
          <CardHeader>
            <CardTitle>{court.name}</CardTitle>
            <CardDescription>{formatPrice(court.hourly_rate)} / hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
              {times.map((time) => {
                const available = isAvailable(court.id, time)
                const selected = selection?.court.id === court.id && selection.start === time
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={!available}
                    aria-pressed={selected}
                    aria-label={`${court.name} at ${time}${available ? "" : " (unavailable)"}`}
                    onClick={() => onSelect({ court, start: time })}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-sm font-medium tabular-nums transition-colors",
                      "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      available && !selected && "hover:border-primary hover:bg-muted",
                      selected && "border-primary bg-primary text-primary-foreground",
                      !available && "cursor-not-allowed bg-muted text-muted-foreground line-through opacity-60"
                    )}
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
