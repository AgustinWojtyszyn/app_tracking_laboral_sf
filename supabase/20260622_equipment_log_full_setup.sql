-- Equipment log full setup: vehicles, fuel loads, plant assets, delete policies and vehicle mileage.
-- Safe to run more than once.

create extension if not exists pgcrypto;

do $$
declare
  constraint_row record;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'role'
  ) then
    for constraint_row in
      select conname
      from pg_constraint
      where conrelid = 'public.users'::regclass
        and contype = 'c'
        and pg_get_constraintdef(oid) ilike '%role%'
    loop
      execute format('alter table public.users drop constraint if exists %I', constraint_row.conname);
    end loop;

    alter table public.users
      add constraint users_role_check
      check (role is null or role in ('admin', 'user', 'solicitante', 'trabajador', 'chofer'));
  end if;
end;
$$;

create or replace function public.app_has_role(check_user_id uuid, expected_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = check_user_id
      and u.role = expected_role
      and u.deleted_at is null
  );
$$;

revoke all on function public.app_has_role(uuid, text) from public, anon;
grant execute on function public.app_has_role(uuid, text) to authenticated;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  license_plate text not null,
  name text,
  vehicle_type text not null default 'utilitario',
  brand text,
  model text,
  year integer,
  assigned_driver_id uuid references public.users(id) on delete set null,
  registration_expires_at date,
  insurance_expires_at date,
  inspection_expires_at date,
  mileage_start integer,
  mileage_end integer,
  status text not null default 'activo',
  notes text,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.vehicles
  add column if not exists mileage_start integer,
  add column if not exists mileage_end integer;

alter table public.vehicles
  drop constraint if exists vehicles_license_plate_not_blank,
  drop constraint if exists vehicles_license_plate_length_check,
  drop constraint if exists vehicles_license_plate_upper_normalized,
  drop constraint if exists vehicles_type_check,
  drop constraint if exists vehicles_status_check,
  drop constraint if exists vehicles_year_check,
  drop constraint if exists vehicles_mileage_start_check,
  drop constraint if exists vehicles_mileage_end_check,
  drop constraint if exists vehicles_mileage_range_check;

alter table public.vehicles
  add constraint vehicles_license_plate_not_blank check (btrim(license_plate) <> ''),
  add constraint vehicles_license_plate_length_check check (char_length(license_plate) <= 10),
  add constraint vehicles_license_plate_upper_normalized check (license_plate = upper(regexp_replace(license_plate, '[^A-Z0-9]', '', 'g'))),
  add constraint vehicles_type_check check (vehicle_type in ('utilitario', 'camion', 'auto', 'moto', 'otro')),
  add constraint vehicles_status_check check (status in ('activo', 'inactivo', 'mantenimiento')),
  add constraint vehicles_year_check check (year is null or (year > 1950 and year <= extract(year from current_date)::integer)),
  add constraint vehicles_mileage_start_check check (mileage_start is null or (mileage_start >= 0 and mileage_start <= 999999999)),
  add constraint vehicles_mileage_end_check check (mileage_end is null or (mileage_end >= 0 and mileage_end <= 999999999)),
  add constraint vehicles_mileage_range_check check (mileage_start is null or mileage_end is null or mileage_end > mileage_start);

create unique index if not exists vehicles_license_plate_uidx
  on public.vehicles (license_plate);
create index if not exists vehicles_status_idx
  on public.vehicles (status);
create index if not exists vehicles_created_at_idx
  on public.vehicles (created_at desc);
create index if not exists vehicles_assigned_driver_id_idx
  on public.vehicles (assigned_driver_id);
create index if not exists vehicles_archived_at_idx
  on public.vehicles (archived_at);

create table if not exists public.vehicle_fuel_loads (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  price_ars numeric(12,2) not null,
  load_date date not null,
  estimated_time time not null,
  liters numeric(10,2) not null,
  mileage integer not null,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.vehicle_fuel_loads
  drop constraint if exists vehicle_fuel_loads_price_ars_check,
  drop constraint if exists vehicle_fuel_loads_liters_check,
  drop constraint if exists vehicle_fuel_loads_mileage_check;

alter table public.vehicle_fuel_loads
  add constraint vehicle_fuel_loads_price_ars_check check (price_ars > 0 and price_ars <= 999999999.99),
  add constraint vehicle_fuel_loads_liters_check check (liters > 0 and liters <= 999999999.99),
  add constraint vehicle_fuel_loads_mileage_check check (mileage >= 0 and mileage <= 999999999);

create index if not exists vehicle_fuel_loads_vehicle_id_idx
  on public.vehicle_fuel_loads (vehicle_id);
create index if not exists vehicle_fuel_loads_load_date_idx
  on public.vehicle_fuel_loads (load_date desc, estimated_time desc);

create table if not exists public.plant_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  location_description text,
  status text not null default 'activo',
  responsible_user_id uuid references public.users(id) on delete set null,
  notes text,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.plant_assets
  drop constraint if exists plant_assets_name_not_blank,
  drop constraint if exists plant_assets_category_check,
  drop constraint if exists plant_assets_status_check;

alter table public.plant_assets
  add constraint plant_assets_name_not_blank check (btrim(name) <> ''),
  add constraint plant_assets_category_check check (category in (
    'Área fría',
    'Área caliente',
    'Depósito',
    'Cámara frigorífica',
    'Parte común',
    'Planta alta operativa',
    'Comedor de personal',
    'Equipo operativo',
    'Otro sector operativo'
  )),
  add constraint plant_assets_status_check check (status in ('activo', 'inactivo', 'mantenimiento', 'requiere_revision'));

create index if not exists plant_assets_category_idx
  on public.plant_assets (category);
create index if not exists plant_assets_status_idx
  on public.plant_assets (status);
create index if not exists plant_assets_created_at_idx
  on public.plant_assets (created_at desc);
create index if not exists plant_assets_responsible_user_id_idx
  on public.plant_assets (responsible_user_id);
create index if not exists plant_assets_archived_at_idx
  on public.plant_assets (archived_at);

create or replace function public.set_equipment_log_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
before update on public.vehicles
for each row
execute function public.set_equipment_log_updated_at();

drop trigger if exists set_plant_assets_updated_at on public.plant_assets;
create trigger set_plant_assets_updated_at
before update on public.plant_assets
for each row
execute function public.set_equipment_log_updated_at();

create or replace function public.enforce_vehicle_driver_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_driver_id is not null
    and not public.app_has_role(new.assigned_driver_id, 'chofer')
  then
    raise exception 'Assigned driver must have chofer role' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_vehicle_driver_role on public.vehicles;
create trigger enforce_vehicle_driver_role
before insert or update of assigned_driver_id on public.vehicles
for each row
execute function public.enforce_vehicle_driver_role();

alter table public.vehicles enable row level security;
alter table public.vehicle_fuel_loads enable row level security;
alter table public.plant_assets enable row level security;

drop policy if exists "Vehicles select authenticated active rows" on public.vehicles;
drop policy if exists "Vehicles insert admin only" on public.vehicles;
drop policy if exists "Vehicles update admin only" on public.vehicles;
drop policy if exists "Vehicles delete admin only" on public.vehicles;

drop policy if exists "Vehicle fuel loads select authenticated" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads insert admin only" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads update admin only" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads delete admin only" on public.vehicle_fuel_loads;

drop policy if exists "Plant assets select authenticated active rows" on public.plant_assets;
drop policy if exists "Plant assets insert admin only" on public.plant_assets;
drop policy if exists "Plant assets update admin only" on public.plant_assets;
drop policy if exists "Plant assets delete admin only" on public.plant_assets;

create policy "Vehicles select authenticated active rows"
  on public.vehicles
  for select
  to authenticated
  using (
    archived_at is null
    and auth.uid() is not null
  );

create policy "Vehicles insert admin only"
  on public.vehicles
  for insert
  to authenticated
  with check (
    public.app_is_admin(auth.uid())
    and (created_by is null or created_by = auth.uid())
  );

create policy "Vehicles update admin only"
  on public.vehicles
  for update
  to authenticated
  using (public.app_is_admin(auth.uid()))
  with check (public.app_is_admin(auth.uid()));

create policy "Vehicles delete admin only"
  on public.vehicles
  for delete
  to authenticated
  using (public.app_is_admin(auth.uid()));

create policy "Vehicle fuel loads select authenticated"
  on public.vehicle_fuel_loads
  for select
  to authenticated
  using (auth.uid() is not null);

create policy "Vehicle fuel loads insert admin only"
  on public.vehicle_fuel_loads
  for insert
  to authenticated
  with check (
    public.app_is_admin(auth.uid())
    and (created_by is null or created_by = auth.uid())
  );

create policy "Vehicle fuel loads update admin only"
  on public.vehicle_fuel_loads
  for update
  to authenticated
  using (public.app_is_admin(auth.uid()))
  with check (public.app_is_admin(auth.uid()));

create policy "Vehicle fuel loads delete admin only"
  on public.vehicle_fuel_loads
  for delete
  to authenticated
  using (public.app_is_admin(auth.uid()));

create policy "Plant assets select authenticated active rows"
  on public.plant_assets
  for select
  to authenticated
  using (
    archived_at is null
    and auth.uid() is not null
  );

create policy "Plant assets insert admin only"
  on public.plant_assets
  for insert
  to authenticated
  with check (
    public.app_is_admin(auth.uid())
    and (created_by is null or created_by = auth.uid())
  );

create policy "Plant assets update admin only"
  on public.plant_assets
  for update
  to authenticated
  using (public.app_is_admin(auth.uid()))
  with check (public.app_is_admin(auth.uid()));

create policy "Plant assets delete admin only"
  on public.plant_assets
  for delete
  to authenticated
  using (public.app_is_admin(auth.uid()));

grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.vehicle_fuel_loads to authenticated;
grant select, insert, update, delete on public.plant_assets to authenticated;

notify pgrst, 'reload schema';
