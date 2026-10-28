import { useEffect } from "react"
import { PadelBall } from "./PadelBall"

const DURATION_MS = 2500 // matches the 2.4s .padel-celebrate-* animations, plus a beat

interface BookingCelebrationProps {
  title: string
  detail: string
  /** Called once the animation has played. Pass a stable callback. */
  onDone: () => void
}

/**
 * A ball smashes onto the screen after a booking. Purely decorative: it ignores
 * clicks and is hidden from screen readers (the toast announces the booking).
 * Dismissed on a timer rather than animationend so it also clears with reduced motion.
 */
export function BookingCelebration({ title, detail, onDone }: BookingCelebrationProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, DURATION_MS)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
      <div className="padel-celebrate-backdrop absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div className="relative grid place-items-center gap-5 text-center">
        <div className="relative size-28">
          <span className="padel-celebrate-ring absolute inset-0 rounded-full border-4 border-lime-400" />
          {/* inline delay: padel.css is unlayered, so it would beat a Tailwind utility */}
          <span
            className="padel-celebrate-ring absolute inset-0 rounded-full border-4 border-sky-500"
            style={{ animationDelay: "120ms" }}
          />
          <PadelBall className="padel-celebrate-ball absolute inset-0 size-full drop-shadow-xl" />
        </div>
        <div className="padel-celebrate-text">
          <p className="text-4xl font-black tracking-tight">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  )
}
