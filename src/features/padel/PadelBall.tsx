import { cn } from "@/lib/utils"
import "./padel.css"

/** A padel ball centred on (0, 0) with radius 12, for drawing inside other SVGs. */
export function BallGlyph() {
  return (
    <g>
      <circle r="11.25" fill="#d9f243" stroke="#a3c219" strokeWidth="1.5" />
      <path
        d="M-8.5 -7.5 C -3 -3, -3 3, -8.5 7.5 M8.5 -7.5 C 3 -3, 3 3, 8.5 7.5"
        fill="none"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <ellipse cx="-4" cy="-5.5" rx="3" ry="1.6" fill="white" opacity="0.4" transform="rotate(-30 -4 -5.5)" />
    </g>
  )
}

export function PadelBall({ className }: { className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className={className} aria-hidden>
      <BallGlyph />
    </svg>
  )
}

/** Bouncing-ball loading indicator. */
export function BallLoader({ label, className }: { label: string; className?: string }) {
  return (
    <div role="status" className={cn("flex items-center gap-3 text-sm text-muted-foreground", className)}>
      <span className="relative inline-block h-9 w-5" aria-hidden>
        <PadelBall className="padel-loader-ball absolute top-0 left-0 size-5" />
        <span className="padel-loader-shadow absolute bottom-0 left-0.5 h-1 w-4 rounded-full bg-foreground/30" />
      </span>
      {label}
    </div>
  )
}
