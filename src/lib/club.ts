/** Club-wide settings. Keep CLOSING_HOUR in sync with schema.sql's duration check. */
export const CLUB_NAME = "Bandeja Padel Club"
export const OPENING_HOUR = 8 // first slot starts 08:00
export const CLOSING_HOUR = 23 // every booking must end by 23:00
export const BOOKING_WINDOW_DAYS = 30
export const CURRENCY = "EUR"

/** Durations offered at checkout, in minutes. The DB allows 60–120. */
export const DURATIONS = [60, 90, 120] as const
export type Duration = (typeof DURATIONS)[number]

const priceFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: CURRENCY,
})

export function formatPrice(amount: number): string {
  return priceFormatter.format(amount)
}
