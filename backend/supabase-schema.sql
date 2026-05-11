-- =============================================================
-- ParkMind — Full Supabase Schema
-- Run this in Supabase → SQL Editor → New query → Run
-- =============================================================

-- ── PROFILES ──────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── LOTS ──────────────────────────────────────────────────────
create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null,
  lat double precision not null,
  lng double precision not null,
  total_spots int not null,
  base_price_inr int not null,          -- ₹ per hour
  walking_minutes_to_landmark int not null default 5,
  description text,
  created_at timestamptz not null default now()
);
alter table public.lots enable row level security;
create policy "lots read authenticated" on public.lots for select using (auth.role() = 'authenticated');

-- ── SPOTS ─────────────────────────────────────────────────────
create type if not exists public.spot_status as enum ('free','occupied','reserved','ev');

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  code text not null,           -- e.g. "S01", "S02"
  status public.spot_status not null default 'free',
  is_ev boolean not null default false,
  unique (lot_id, code)
);
alter table public.spots enable row level security;
create policy "spots read authenticated" on public.spots for select using (auth.role() = 'authenticated');
-- Service role can update spot status (used by booking + mock-sensor)
create policy "spots update service" on public.spots for update using (true);

-- ── BOOKINGS ──────────────────────────────────────────────────
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spot_id uuid not null references public.spots(id) on delete cascade,
  lot_id uuid not null references public.lots(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  price_inr int not null,
  status text not null default 'active',  -- 'active' | 'completed' | 'cancelled'
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create policy "own bookings read"   on public.bookings for select using (auth.uid() = user_id);
create policy "own bookings insert" on public.bookings for insert with check (auth.uid() = user_id);
create policy "own bookings update" on public.bookings for update using (auth.uid() = user_id);

-- ── EVENTS ────────────────────────────────────────────────────
-- Concerts, matches, meetups — used by the demand forecaster
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue text not null,
  area text not null,              -- matches lots.area
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expected_attendance int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "events read authenticated" on public.events for select using (auth.role() = 'authenticated');

-- ── THREADS ───────────────────────────────────────────────────
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.threads enable row level security;
create policy "own threads read"   on public.threads for select using (auth.uid() = user_id);
create policy "own threads insert" on public.threads for insert with check (auth.uid() = user_id);
create policy "own threads update" on public.threads for update using (auth.uid() = user_id);
create policy "own threads delete" on public.threads for delete using (auth.uid() = user_id);

-- ── MESSAGES ──────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,             -- 'user' | 'assistant'
  parts jsonb not null,           -- Vercel AI SDK UIMessage parts
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "own messages read"   on public.messages for select using (auth.uid() = user_id);
create policy "own messages insert" on public.messages for insert with check (auth.uid() = user_id);
create index if not exists messages_thread_created on public.messages (thread_id, created_at);
