import { format } from "date-fns"

/** Postgres returns "HH:MM:SS"; the app works in "HH:MM". */
export function toHHMM(time: string): string {
  return time.slice(0, 5)
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** Local calendar date as YYYY-MM-DD (not toISOString, which shifts to UTC). */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

/** Combines a YYYY-MM-DD date and HH:MM time into a local Date. */
export function toLocalDateTime(dateKey: string, time: string): Date {
  const [y, mo, d] = dateKey.split("-").map(Number)
  const [h, mi] = time.split(":").map(Number)
  return new Date(y, mo - 1, d, h, mi)
}

export function formatDateLong(dateKey: string): string {
  return format(toLocalDateTime(dateKey, "00:00"), "EEEE d MMMM yyyy")
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}
