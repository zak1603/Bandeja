import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDateLong, formatDuration } from "@/lib/time"

export interface BookingSummary {
  courtName: string
  dateKey: string
  start: string
  end: string
  durationMinutes: number
}

interface BookingConfirmDialogProps {
  summary: BookingSummary | null
  /** The name the booking will show under. */
  bookingAs: string | null
  submitting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

export function BookingConfirmDialog({
  summary,
  bookingAs,
  submitting,
  onConfirm,
  onOpenChange,
}: BookingConfirmDialogProps) {
  return (
    <Dialog open={summary !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm your booking</DialogTitle>
          <DialogDescription>The court will show as booked under your name.</DialogDescription>
        </DialogHeader>

        {summary && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {bookingAs && (
              <>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{bookingAs}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Court</dt>
            <dd className="font-medium">{summary.courtName}</dd>
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-medium">{formatDateLong(summary.dateKey)}</dd>
            <dt className="text-muted-foreground">Time</dt>
            <dd className="font-medium tabular-nums">
              {summary.start} – {summary.end} ({formatDuration(summary.durationMinutes)})
            </dd>
          </dl>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Back
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? "Reserving…" : "Confirm booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
