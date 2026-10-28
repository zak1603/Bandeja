/** Turns a Supabase/PostgREST error into something a player can act on. */
export function describeBookingError(error: { code?: string; message: string }): string {
  // 23505 = bookings_unique_slot, 23P01 = bookings_no_overlap
  if (error.code === "23505" || error.code === "23P01") {
    return "Sorry — that slot was just taken. Please pick another time."
  }
  // Everything else, including messages raised by our triggers (P0001).
  return error.message
}
