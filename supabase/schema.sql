-- =============================================================================
-- Bandeja Padel — database schema
-- Run once in Supabase Dashboard -> SQL Editor (or `supabase db push`).
-- Safe to re-run on an empty project; not written as an incremental migration.
-- =============================================================================

-- Needed so the overlap exclusion constraint can mix uuid (=) with ranges (&&).
create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.booking_status as enum ('confirmed', 'cancelled', 'completed');

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null default '',
  phone_number text not null default '',
  created_at   timestamptz not null default now()
);

create table public.courts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  hourly_rate numeric(10, 2) not null check (hourly_rate >= 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  court_id     uuid not null references public.courts (id) on delete restrict,
  booking_date date not null,
  start_time   time not null,
  end_time     time not null,
  total_price  numeric(10, 2) not null default 0,
  status       public.booking_status not null default 'confirmed',
  created_at   timestamptz not null default now(),

  constraint bookings_starts_on_the_hour
    check (extract(minute from start_time) = 0 and extract(second from start_time) = 0),
  constraint bookings_valid_duration
    check (end_time - start_time between interval '1 hour' and interval '2 hours'),

  -- Atomic bookings, part 2: no two live bookings on one court may overlap
  -- (catches a 10:00–11:30 booking colliding with an 11:00 start).
  constraint bookings_no_overlap exclude using gist (
    court_id with =,
    tsrange(booking_date + start_time, booking_date + end_time) with &&
  ) where (status <> 'cancelled')
);

-- Atomic bookings, part 1 (House Rule): one live booking per (court, date, start).
-- Partial so that a cancelled booking releases its slot for someone else.
create unique index bookings_unique_slot
  on public.bookings (court_id, booking_date, start_time)
  where status <> 'cancelled';

create index bookings_user_idx on public.bookings (user_id, booking_date);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- Create a profile row for every new auth user, from the sign-up metadata.
-- Runs server-side, so it works even when email confirmation means the client
-- has no session yet at sign-up time.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone_number', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Price and ownership are decided by the database, never trusted from the client.
create function public.prepare_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rate numeric(10, 2);
begin
  select c.hourly_rate into rate
  from public.courts c
  where c.id = new.court_id and c.is_active;

  if rate is null then
    raise exception 'Court is not available for booking' using errcode = 'P0001';
  end if;

  if new.booking_date < current_date then
    raise exception 'Cannot book a date in the past' using errcode = 'P0001';
  end if;

  new.user_id     := auth.uid();
  new.status      := 'confirmed';
  new.created_at  := now();
  new.total_price := round(rate * extract(epoch from (new.end_time - new.start_time)) / 3600, 2);
  return new;
end;
$$;

create trigger bookings_prepare
  before insert on public.bookings
  for each row execute function public.prepare_booking();

-- Clients may only move a booking from confirmed -> cancelled.
create function public.guard_booking_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and not (old.status = 'confirmed' and new.status = 'cancelled') then
    raise exception 'Only confirmed bookings can be cancelled' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger bookings_guard_update
  before update on public.bookings
  for each row execute function public.guard_booking_update();

-- -----------------------------------------------------------------------------
-- Availability lookup
-- RLS hides other users' bookings, but the grid still needs to know which
-- slots are taken. This returns only court/time ranges — no user data.
-- -----------------------------------------------------------------------------
create function public.get_booked_slots(p_date date)
returns table (court_id uuid, start_time time, end_time time)
language sql
stable
security definer
set search_path = ''
as $$
  select b.court_id, b.start_time, b.end_time
  from public.bookings b
  where b.booking_date = p_date
    and b.status <> 'cancelled';
$$;

revoke all on function public.get_booked_slots(date) from public;
grant execute on function public.get_booked_slots(date) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security (House Rule: every table)
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courts   enable row level security;
alter table public.bookings enable row level security;

-- profiles: you see and edit only yourself (rows are created by the trigger).
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- courts: anyone may browse active courts; changes go through the dashboard.
create policy "Anyone reads active courts"
  on public.courts for select to anon, authenticated
  using (is_active);

-- bookings: own rows only. No delete policy — cancel instead.
create policy "Users read own bookings"
  on public.bookings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create own bookings"
  on public.bookings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users cancel own bookings"
  on public.bookings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status = 'cancelled');

-- Column-level: the only field a client can ever update is status.
revoke update on public.bookings from anon, authenticated;
grant update (status) on public.bookings to authenticated;

-- -----------------------------------------------------------------------------
-- Seed data — edit names and rates to match the club
-- -----------------------------------------------------------------------------
insert into public.courts (name, hourly_rate) values
  ('Court 1 (Panoramic Indoor)', 40.00),
  ('Court 2 (Outdoor)',          28.00),
  ('Court 3 (Indoor)',           35.00);
