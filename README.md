# Bandeja — Padel Court Booking

Book padel courts by date, length and time slot; get an instant email receipt (and the club gets one too).

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
| `RESEND_API_KEY` | Server only |
| `ADMIN_NOTIFICATION_EMAIL` | Receives a copy of every booking |
| `RESEND_FROM_EMAIL` | Optional; needs a domain verified in Resend |
| `CLUB_NAME`, `CLUB_ADDRESS` | Optional; shown in emails |

## Scripts

`npm run dev` · `npm run lint` · `npx tsc -b` · `npm run build` · `/check` in Claude Code runs all pre-PR checks.
