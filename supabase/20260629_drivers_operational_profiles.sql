-- Choferes operativos para Libro Registro de Equipo.
-- Permite asignar choferes a vehiculos sin crear usuarios auth.

create extension if not exists pgcrypto;

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  notes text,
  user_id uuid references public.users(id) on delete set null,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drivers_name_not_blank check (btrim(name) <> '')
);

alter table public.drivers
  add column if not exists phone text,
  add column if not exists notes text,
  add column if not exists user_id uuid references public.users(id) on delete set null,
  add column if not exists is_active boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.drivers
  drop constraint if exists drivers_name_not_blank;
alter table public.drivers
  add constraint drivers_name_not_blank check (btrim(name) <> '');

alter table public.vehicles
  add column if not exists assigned_driver_profile_id uuid references public.drivers(id) on delete set null;

create index if not exists drivers_active_idx
  on public.drivers (is_active, archived_at);
create index if not exists drivers_user_id_idx
  on public.drivers (user_id);
create index if not exists vehicles_assigned_driver_profile_id_idx
  on public.vehicles (assigned_driver_profile_id);

drop trigger if exists set_drivers_updated_at on public.drivers;
create trigger set_drivers_updated_at
before update on public.drivers
for each row
execute function public.set_equipment_log_updated_at();

alter table public.drivers enable row level security;

drop policy if exists "Drivers select authenticated" on public.drivers;
drop policy if exists "Drivers insert admin only" on public.drivers;
drop policy if exists "Drivers update admin only" on public.drivers;
drop policy if exists "Drivers delete admin only" on public.drivers;

create policy "Drivers select authenticated"
  on public.drivers
  for select
  to authenticated
  using (auth.uid() is not null);

create policy "Drivers insert admin only"
  on public.drivers
  for insert
  to authenticated
  with check (public.app_is_admin(auth.uid()));

create policy "Drivers update admin only"
  on public.drivers
  for update
  to authenticated
  using (public.app_is_admin(auth.uid()))
  with check (public.app_is_admin(auth.uid()));

create policy "Drivers delete admin only"
  on public.drivers
  for delete
  to authenticated
  using (public.app_is_admin(auth.uid()));

insert into public.drivers (name)
select seed.name
from (values ('Fabio'), ('Diego'), ('Daniel'), ('Ismael'), ('Eduardo')) as seed(name)
where not exists (
  select 1
  from public.drivers d
  where lower(btrim(d.name)) = lower(btrim(seed.name))
    and d.archived_at is null
);

grant select, insert, update, delete on public.drivers to authenticated;

notify pgrst, 'reload schema';
