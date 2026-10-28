# CLAUDE.md

Bandeja — padel court booking app for home use: one court ("Unit 4"), no payments; signed-in users see who has booked each slot. React 19 + TypeScript 7 + Vite 8, Tailwind v4, shadcn/ui (base-nova style, Base UI primitives), Supabase (Postgres, Auth, RLS), Resend email via a Vercel serverless function.

## Commands

- `npm run dev` — Vite dev server (frontend only; `/api/*` is not served)
- `npx vercel dev` — frontend + `api/` functions together, for testing emails locally
- `npm run lint` — oxlint · `npx tsc -b` — type-check (includes `api/`) · `npm run build`
- `npx shadcn@latest add <component>` — add UI components to `src/components/ui/` (generated; don't hand-edit)

## House Rules

- **Never leak API keys.** `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` live only in `.env` (git-ignored) and Vercel env vars. Anything prefixed `VITE_` ships to the browser — never put a secret there. Never import `resend` from `src/`.
- **RLS on every table.** Any new table in `supabase/schema.sql` must `enable row level security` and get explicit policies.
- **Atomic bookings.** Double-booking is prevented in the DB, not the UI: a partial unique index on `(court_id, booking_date, start_time)` plus a `bookings_no_overlap` exclusion constraint, both ignoring cancelled rows. Handle `23505` / `23P01` via `describeBookingError`.
- **Trust the DB, not the client.** `prepare_booking` trigger sets `user_id`, `status`. Clients may only update `bookings.status` to `cancelled`. The email function re-reads the booking as the calling user; it never trusts the request body.
- **Green before push.** `npm run lint`, `npx tsc -b`, `npm run build` must pass before a PR (`/check` runs all three).

## Project Structure

| Path | Purpose |
|---|---|
| `src/lib/supabaseClient.ts` | Supabase client (anon key) |
| `src/lib/email.ts` | `sendBookingConfirmation` — calls `/api/notify` with the user's access token |
| `src/lib/club.ts` | Opening hours (06:00–23:00), 30-min start step, durations, booking window |
| `src/lib/time.ts`, `useNow.ts` | Date/time helpers (local dates, `HH:MM`) |
| `src/features/auth/` | `AuthProvider`, `useAuth`, `playerName`. **No accounts or passwords**: players are Supabase anonymous (guest) users, remembered per device. Needs "Allow anonymous sign-ins" on in Supabase |
| `src/features/courts/` | `useCourts`, `useBookedSlots` (RPC `get_booked_slots`), `CourtPicker`, `SlotGrid` (slots grouped by morning/afternoon/evening, with free/booked/clash/past status) |
| `src/features/booking/` | `BookingGrid` (court → date → duration → slot → reserve), `GuestDetailsDialog` (first booking on a device: name + phone → `signInAnonymously` → books), `BookingConfirmDialog` (later bookings). "My bookings" tab only shows once the device has a guest session |
| `src/features/dashboard/` | `UserDashboard` — upcoming/past bookings, cancel |
| `src/features/padel/` | Decorative animations: `CourtRally`/`CourtHero`, `PadelBall`/`BallLoader`, `BookingCelebration`; keyframes in `padel.css` (every class `padel-*`, all disabled under reduced motion) |
| `api/notify.ts` | Vercel function: booking alert (name, phone, court, date, time, length) to `ADMIN_NOTIFICATION_EMAIL`; player receipt only if the player has an email and `RESEND_FROM_EMAIL` is set. 503 = email not configured, client stays silent |
| `supabase/schema.sql` | Tables, constraints, triggers, RPC, RLS policies, seed courts |

## Data Model (`src/types.ts`)

```ts
type BookingStatus = "confirmed" | "cancelled" | "completed"
UserProfile { id /* auth.users.id */, full_name, phone_number, created_at }
Court       { id, name, is_active }
Booking     { id, user_id, court_id, booking_date /* YYYY-MM-DD */, start_time, end_time /* HH:MM */,
              status, created_at }
BookedSlot  { court_id, start_time, end_time, booked_by /* null when signed out */ }
```

Postgres returns times as `HH:MM:SS` — normalize with `toHHMM()`. Profiles are created by the `handle_new_user` trigger from the metadata passed to `signInAnonymously` (`full_name`, `phone_number`). Other users' bookings are hidden by RLS; availability comes from the `get_booked_slots(p_date)` security-definer RPC, which includes the booker's `full_name` only for signed-in callers.

## Conventions

- Import via `@/` alias. Feature code in `src/features/<feature>/`.
- `cn()` comes from the `cn` package (re-exported by `@/lib/utils`).
- Schema changes: edit `supabase/schema.sql` and keep `src/types.ts` + `src/lib/club.ts` (hours/durations) in sync with DB checks.
