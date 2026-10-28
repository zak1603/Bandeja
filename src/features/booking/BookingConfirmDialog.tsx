import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatPrice } from "@/lib/club"
import { formatDateLong, formatDuration } from "@/lib/time"

export interface BookingSummary {
  courtName: string
  dateKey: string
  start: string
  end: string
  durationMinutes: number
  price: number
}

interface BookingConfirmDialogProps {
  summary: BookingSummary | null
  submitting: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

export function BookingConfirmDialog({
  summary,
  submitting,
  onConfirm,
  onOpenChange,
}: BookingConfirmDialogProps) {
  return (
    <Dialog open={summary !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm your booking</DialogTitle>
          <DialogDescription>
            A receipt will be emailed to you as soon as the court is locked in.
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Court</dt>
            <dd className="font-medium">{summary.courtName}</dd>
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-medium">{formatDateLong(summary.dateKey)}</dd>
            <dt className="text-muted-foreground">Time</dt>
            <dd className="font-medium tabular-nums">
              {summary.start} – {summary.end} ({formatDuration(summary.durationMinutes)})
            </dd>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-base font-semibold">{formatPrice(summary.price)}</dd>
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
