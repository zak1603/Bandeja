import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"
import { BallGlyph } from "./PadelBall"

// Side view of a court, 400×120. Floor at y=105, glass walls at each end, net at x=200.
// The ball's path and timing live in padel.css (.padel-rally-*).

const BALL_SCALE = 5 / 12 // BallGlyph has radius 12; the rally ball has radius 5
const TRAIL = [0.05, 0.1, 0.15] // seconds each ghost ball lags behind

const HOLES = [-4, 0, 4].flatMap((dx) => [-5, 0, 5].map((dy) => [dx, dy] as const))

function Paddle({ x, side, color }: { x: number; side: "left" | "right"; color: string }) {
  return (
    <g className={`padel-paddle padel-paddle-${side}`} style={{ transformOrigin: `${x}px 92px` }}>
      <rect x={x - 1.6} y={73} width={3.2} height={19} rx={1.6} fill="#0f172a" opacity={0.8} />
      <ellipse cx={x} cy={62} rx={9} ry={12} fill={color} stroke="white" strokeWidth={1.5} />
      {HOLES.map(([dx, dy]) => (
        <circle key={`${dx},${dy}`} cx={x + dx} cy={62 + dy} r={1} fill="white" opacity={0.55} />
      ))}
    </g>
  )
}

/** An endless padel rally: over the net, off the floor, off the back glass, and back again. */
export function CourtRally({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 120" className={className} aria-hidden>
      <rect className="padel-glass padel-glass-left" x="12" y="44" width="11" height="61" rx="1.5" />
      <rect className="padel-glass padel-glass-right" x="377" y="44" width="11" height="61" rx="1.5" />

      <rect x="8" y="105" width="384" height="3" rx="1.5" fill="white" opacity="0.6" />
      <rect x="198.75" y="84" width="2.5" height="21" fill="white" opacity="0.45" />
      <rect x="195" y="82" width="10" height="2.5" rx="1" fill="white" opacity="0.9" />

      <ellipse className="padel-dust padel-dust-right" cx="300" cy="105" rx="10" ry="2.5" />
      <ellipse className="padel-dust padel-dust-left" cx="100" cy="105" rx="10" ry="2.5" />

      <Paddle x={46} side="left" color="#f97316" />
      <Paddle x={354} side="right" color="#ec4899" />

      {TRAIL.map((lag, i) => (
        <g key={lag} className="padel-ghost padel-rally-x" style={{ "--lag": `${lag}s` } as CSSProperties}>
          <g className="padel-rally-y">
            <circle r={4.5 - i} fill="white" opacity={0.45 - i * 0.12} />
          </g>
        </g>
      ))}

      <g className="padel-rally-x">
        <ellipse className="padel-rally-shadow" cx="0" cy="107" rx="6" ry="1.6" fill="#0b1e4a" />
        <g className="padel-rally-y">
          <g className="padel-spin">
            <g transform={`scale(${BALL_SCALE})`}>
              <BallGlyph />
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}

export function CourtHero({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl bg-linear-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-lg",
        className
      )}
    >
      <div className="grid items-end gap-2 sm:grid-cols-[1fr_minmax(0,28rem)]">
        <div className="px-5 pt-5 sm:py-6 sm:pl-8">
          <p className="text-xs font-semibold tracking-widest text-white/70 uppercase">Unit 4</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Fancy a match?</h1>
          <p className="mt-1 text-sm text-white/80">
            Pick a day and a slot, and everyone can see the court is yours.
          </p>
        </div>
        <CourtRally className="w-full" />
      </div>
    </section>
  )
}
