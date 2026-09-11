-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text unique not null default ('KSV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6))),
  booking_date date not null,
  check_in date,
  check_out date,
  customer_name text not null,
  phone text,
  booking_type text not null default 'room' check (booking_type in ('room','house')),
  accommodation_price numeric(12,2) not null default 1900,
  food text default 'ไม่ได้สั่งเพิ่ม',
  food_items jsonb not null default '[]'::jsonb,
  extra_items jsonb not null default '[]'::jsonb,
  adults integer not null default 1 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  note text,
  status text not null default 'booked'
    check (status in ('booked','waiting_payment','maintenance','cancelled')),
  deposit numeric(12,2) not null default 0,
  remaining numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- เพิ่มคอลัมน์สำหรับฐานข้อมูลเดิมที่มีอยู่แล้ว
alter table public.bookings add column if not exists check_in date;
alter table public.bookings add column if not exists check_out date;
alter table public.bookings add column if not exists booking_type text not null default 'room';
alter table public.bookings add column if not exists accommodation_price numeric(12,2) not null default 1900;
alter table public.bookings add column if not exists food_items jsonb not null default '[]'::jsonb;
alter table public.bookings add column if not exists extra_items jsonb not null default '[]'::jsonb;
alter table public.bookings add column if not exists total numeric(12,2) not null default 0;

update public.bookings
set check_in = coalesce(check_in, booking_date),
    check_out = coalesce(check_out, booking_date + 1),
    total = case when total = 0 then deposit + remaining else total end
where check_in is null or check_out is null or total = 0;

create index if not exists bookings_booking_date_idx on public.bookings(booking_date);
create index if not exists bookings_check_in_idx on public.bookings(check_in);
create index if not exists bookings_check_out_idx on public.bookings(check_out);
create index if not exists bookings_status_idx on public.bookings(status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;

drop policy if exists "authenticated can read bookings" on public.bookings;
create policy "authenticated can read bookings"
on public.bookings for select
to authenticated using (true);

drop policy if exists "authenticated can insert bookings" on public.bookings;
create policy "authenticated can insert bookings"
on public.bookings for insert
to authenticated with check (true);

drop policy if exists "authenticated can update bookings" on public.bookings;
create policy "authenticated can update bookings"
on public.bookings for update
to authenticated using (true) with check (true);

drop policy if exists "authenticated can delete bookings" on public.bookings;
create policy "authenticated can delete bookings"
on public.bookings for delete
to authenticated using (true);

-- Realtime
alter table public.bookings replica identity full;
