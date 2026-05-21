-- Run this in the Supabase SQL Editor.
-- It creates a table for the franchise form and allows public inserts
-- from the website while keeping reads locked down.

create extension if not exists "pgcrypto";

create table if not exists public.franchise_applications (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    phone_number text not null,
    email text not null,
    city text not null,
    gym_name text not null,
    gym_area_sqft integer not null check (gym_area_sqft > 0),
    current_setup text not null default '',
    created_at timestamptz not null default now()
);

alter table public.franchise_applications enable row level security;

drop policy if exists "Anyone can submit franchise applications" on public.franchise_applications;
create policy "Anyone can submit franchise applications"
on public.franchise_applications
for insert
to anon, authenticated
with check (true);

drop policy if exists "Service role can read franchise applications" on public.franchise_applications;
create policy "Service role can read franchise applications"
on public.franchise_applications
for select
to service_role
using (true);
