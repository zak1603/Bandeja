# Bandeja — Padel Court Booking

Book the home padel court ("Unit 4") by date, length and time slot, and see who has booked each slot. Start times every 30 minutes from 06:00. No payments, no accounts or passwords: players just give a name and phone number on their first booking. The admin gets an email for every booking (who, when, how long).

**Stack:** React + TypeScript + Vite · Tailwind v4 + shadcn/ui · Supabase (Postgres, Auth, RLS) · Resend · Vercel

## Setup

1. `npm install`
2. Create a Supabase project, then run [`supabase/schema.sql`](supabase/schema.sql) in **SQL Editor**.
3. In Supabase **Authentication → URL Configuration**, set the Site URL to your app URL (`http://localhost:5173` locally, your Vercel URL in production) so confirmation and password-reset links land back in the app.
4. `cp .env.example .env` and fill in the values (Supabase → Project Settings → API; Resend → API Keys).
5. `npm run dev` — or `npx vercel dev` to also run the `/api` email function locally.

## Deploy (Vercel)

Import the GitHub repo in Vercel (framework preset: Vite). Add these environment variables:

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Used by the browser **and** the email function |
| `RESEND_API_KEY` | Server only. Leave unset to turn email off |
| `ADMIN_NOTIFICATION_EMAIL` | Receives every booking. Without `RESEND_FROM_EMAIL` it must be your Resend account's email |
| `RESEND_FROM_EMAIL` | Optional; needs a domain verified in Resend. Also turns on player receipts |
| `CLUB_NAME`, `CLUB_ADDRESS` | Optional; shown in emails |

## Scripts

`npm run dev` · `npm run lint` · `npx tsc -b` · `npm run build` · `/check` in Claude Code runs all pre-PR checks.
