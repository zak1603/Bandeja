import { CircleCheck } from "lucide-react"
import { PadelBall } from "@/features/padel/PadelBall"
import { cn } from "@/lib/utils"
import type { Court } from "@/types"

interface CourtPickerProps {
  courts: Court[]
  selectedId: string | null
  onSelect: (court: Court) => void
}

export function CourtPicker({ courts, selectedId, onSelect }: CourtPickerProps) {
  if (courts.length === 0) {
    return <p className="text-sm text-muted-foreground">No courts are open for booking right now.</p>
  }

  return (
    <div className="grid gap-2">
      {courts.map((court) => {
        const selected = court.id === selectedId
        return (
          <button
            key={court.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(court)}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary hover:bg-muted"
            )}
          >
            <PadelBall className="size-9 shrink-0" />
            <span className="grid flex-1">
              <span className="text-base font-semibold">{court.name}</span>
              <span className="text-xs text-muted-foreground">Padel court</span>
            </span>
            {selected && <CircleCheck className="size-5 text-primary" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}
