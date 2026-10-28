/** Club-wide settings. Keep CLOSING_HOUR in sync with schema.sql's duration check. */
export const CLUB_NAME = "Bandeja Padel Club"
export const OPENING_HOUR = 6 // first slot starts 06:00
export const CLOSING_HOUR = 23 // every booking must end by 23:00
/** Gap between start times. schema.sql only allows starts on :00 and :30. */
export const SLOT_STEP_MINUTES = 30
export const BOOKING_WINDOW_DAYS = 30

/** Durations offered when booking, in minutes. The DB allows 60–120. */
export const DURATIONS = [60, 90, 120] as const
export type Duration = (typeof DURATIONS)[number]
