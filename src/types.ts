export type BookingStatus = "confirmed" | "cancelled" | "completed"

export interface UserProfile {
  id: string // References auth.users.id
  full_name: string
  phone_number: string
  created_at: string
}

export interface Court {
  id: string
  name: string // e.g., "Court 1 (Indoor)"
  hourly_rate: number
  is_active: boolean
}

export interface Booking {
  id: string
  user_id: string
  court_id: string
  booking_date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  total_price: number
  status: BookingStatus
  created_at: string
}

/** A booking joined with its court, as returned by `select("*, courts(name)")`. */
export interface BookingWithCourt extends Booking {
  courts: Pick<Court, "name"> | null
}

/** A taken time range, as returned by the `get_booked_slots` RPC. */
export interface BookedSlot {
  court_id: string
  start_time: string
  end_time: string
}
