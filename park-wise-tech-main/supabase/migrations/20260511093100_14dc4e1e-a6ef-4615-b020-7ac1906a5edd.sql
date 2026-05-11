
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
create policy "own profile upsert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- lots
create table public.lots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null,
  lat double precision not null,
  lng double precision not null,
  total_spots int not null,
  base_price_inr int not null,
  walking_minutes_to_landmark int not null default 5,
  description text,
  created_at timestamptz not null default now()
);
alter table public.lots enable row level security;
create policy "lots read all" on public.lots for select using (auth.role() = 'authenticated');

-- spots
create type public.spot_status as enum ('free','occupied','reserved','ev');
create table public.spots (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.lots(id) on delete cascade,
  code text not null,
  status public.spot_status not null default 'free',
  is_ev boolean not null default false,
  unique (lot_id, code)
);
alter table public.spots enable row level security;
create policy "spots read all" on public.spots for select using (auth.role() = 'authenticated');

-- bookings
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spot_id uuid not null references public.spots(id) on delete cascade,
  lot_id uuid not null references public.lots(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  price_inr int not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create policy "own bookings read" on public.bookings for select using (auth.uid() = user_id);
create policy "own bookings insert" on public.bookings for insert with check (auth.uid() = user_id);
create policy "own bookings update" on public.bookings for update using (auth.uid() = user_id);

-- events (concerts, matches, etc.)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue text not null,
  area text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expected_attendance int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "events read all" on public.events for select using (auth.role() = 'authenticated');

-- threads
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.threads enable row level security;
create policy "own threads read" on public.threads for select using (auth.uid() = user_id);
create policy "own threads insert" on public.threads for insert with check (auth.uid() = user_id);
create policy "own threads update" on public.threads for update using (auth.uid() = user_id);
create policy "own threads delete" on public.threads for delete using (auth.uid() = user_id);

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  parts jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "own messages read" on public.messages for select using (auth.uid() = user_id);
create policy "own messages insert" on public.messages for insert with check (auth.uid() = user_id);
create index on public.messages (thread_id, created_at);

-- seed lots
insert into public.lots (id, name, area, lat, lng, total_spots, base_price_inr, walking_minutes_to_landmark, description) values
('11111111-1111-1111-1111-111111111111','Forum Mall Basement','Koramangala',12.9345,77.6118,40,60,3,'Covered basement, CCTV, lift access'),
('22222222-2222-2222-2222-222222222222','80ft Road Open Lot','Koramangala',12.9352,77.6240,30,40,7,'Open lot near 80ft Rd cafés'),
('33333333-3333-3333-3333-333333333333','Sony Signal Multilevel','Koramangala',12.9311,77.6196,25,80,2,'Multilevel structure with EV bays'),
('44444444-4444-4444-4444-444444444444','Indiranagar 100ft','Indiranagar',12.9716,77.6411,30,90,4,'Premium location, busy weekends'),
('55555555-5555-5555-5555-555555555555','HSR 27th Main','HSR Layout',12.9116,77.6446,20,50,8,'Quiet residential perimeter'),
('66666666-6666-6666-6666-666666666666','Stadium Side Lot','Koramangala',12.9290,77.6140,15,120,10,'Right next to Chinnaswamy approach');

-- seed events
insert into public.events (title, venue, area, starts_at, ends_at, expected_attendance) values
('IPL Cricket: RCB vs MI','Chinnaswamy Stadium','Koramangala', now() + interval '4 hours', now() + interval '8 hours', 38000),
('Indie Night Live','Forum Mall','Koramangala', now() + interval '6 hours', now() + interval '10 hours', 1200),
('Tech Meetup','Indiranagar Social','Indiranagar', now() + interval '2 hours', now() + interval '5 hours', 300);

-- seed spots: generate per lot
do $$
declare l record; i int; st public.spot_status; ev boolean;
begin
  for l in select id, total_spots from public.lots loop
    for i in 1..l.total_spots loop
      ev := (i % 8 = 0);
      st := case
        when i % 4 = 0 then 'occupied'::public.spot_status
        when i % 7 = 0 then 'reserved'::public.spot_status
        when ev then 'ev'::public.spot_status
        else 'free'::public.spot_status end;
      insert into public.spots (lot_id, code, status, is_ev) values (l.id, 'S'||lpad(i::text,2,'0'), st, ev);
    end loop;
  end loop;
end $$;
