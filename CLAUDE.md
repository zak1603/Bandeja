# CLAUDE.md

Bandeja — padel court booking app. React 19 + TypeScript 7 + Vite 8, Tailwind v4, shadcn/ui (base-nova style, Base UI primitives), Supabase (Postgres, Auth, RLS), Resend email via a Vercel serverless function.

## Commands

- `npm run dev` — Vite dev server (frontend only; `/api/*` is not served)
- `npx vercel dev` — frontend + `api/` functions together, for testing emails locally
- `npm run lint` — oxlint · `npx tsc -b` — type-check (includes `api/`) · `npm run build`
- `npx shadcn@latest add <component>` — add UI components to `src/components/ui/` (generated; don't hand-edit)

## House Rules

- **Never leak API keys.** `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` live only in `.env` (git-ignored) and Vercel env vars. Anything prefixed `VITE_` ships to the browser — never put a secret there. Never import `resend` from `src/`.
- **RLS on every table.** Any new table in `supabase/schema.sql` must `enable row level security` and get explicit policies.
- **Atomic bookings.** Double-booking is prevented in the DB, not the UI: a partial unique index on `(court_id, booking_date, start_time)` plus a `bookings_no_overlap` exclusion constraint, both ignoring cancelled rows. Handle `23505` / `23P01` via `describeBookingError`.
- **Trust the DB, not the client.** `prepare_booking` trigger sets `user_id`, `status`, `total_price`. Clients may only update `bookings.status` to `cancelled`. The email function re-reads the booking as the calling user; it never trusts the request body.
- **Green before push.** `npm run lint`, `npx tsc -b`, `npm run build` must pass before a PR (`/check` runs all three).

## Project Structure

| Path | Purpose |
|---|---|
| `src/lib/supabaseClient.ts` | Supabase client (anon key) |
| `src/lib/email.ts` | Calls `/api/send-confirmation` with the user's access token |
| `src/lib/club.ts` | Opening hours, durations, currency, price formatting |
| `src/lib/time.ts`, `useNow.ts` | Date/time helpers (local dates, `HH:MM`) |
| `src/features/auth/` | `AuthProvider`, `useAuth`, `AuthModal` (sign in/up, forgot & reset password) |
| `src/features/courts/` | `useCourts`, `useBookedSlots` (RPC `get_booked_slots`), `SlotGrid` |
| `src/features/booking/` | `BookingGrid` (date → duration → slot → reserve), `BookingConfirmDialog` |
| `src/features/dashboard/` | `UserDashboard` — upcoming/past bookings, cancel |
| `api/send-confirmation.ts` | Vercel function: Resend emails to player + `ADMIN_NOTIFICATION_EMAIL` |
| `supabase/schema.sql` | Tables, constraints, triggers, RPC, RLS policies, seed courts |

## Data Model (`src/types.ts`)

```ts
type BookingStatus = "confirmed" | "cancelled" | "completed"
UserProfile { id /* auth.users.id */, full_name, phone_number, created_at }
Court       { id, name, hourly_rate, is_active }
Booking     { id, user_id, court_id, booking_date /* YYYY-MM-DD */, start_time, end_time /* HH:MM */,
              total_price, status, created_at }
```

Postgres returns times as `HH:MM:SS` and numerics possibly as strings — normalize with `toHHMM()` / `Number()`. Profiles are created by the `handle_new_user` trigger from sign-up metadata (`full_name`, `phone_number`). Other users' bookings are hidden by RLS; availability comes from the `get_booked_slots(p_date)` security-definer RPC.

## Conventions

- Import via `@/` alias. Feature code in `src/features/<feature>/`.
- `cn()` comes from the `cn` package (re-exported by `@/lib/utils`).
- Schema changes: edit `supabase/schema.sql` and keep `src/types.ts` + `src/lib/club.ts` (hours/durations) in sync with DB checks.
