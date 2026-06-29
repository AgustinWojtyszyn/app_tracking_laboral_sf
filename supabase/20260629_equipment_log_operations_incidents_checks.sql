-- Libro Registro de Equipo: operacion diaria, incidencias y revisiones genericas.
-- Complementa vehicles y plant_assets existentes sin duplicarlos.

create extension if not exists pgcrypto;

create table if not exists public.equipment_daily_operations (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  plant_asset_id uuid references public.plant_assets(id) on delete cascade,
  equipment_name text,
  operation_date date not null,
  shift text not null,
  usage_time text not null,
  operator_name text not null,
  observations text,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_daily_operations_target_check check (
    vehicle_id is null or plant_asset_id is null
  ),
  constraint equipment_daily_operations_shift_check check (btrim(shift) <> ''),
  constraint equipment_daily_operations_usage_time_check check (btrim(usage_time) <> ''),
  constraint equipment_daily_operations_operator_check check (btrim(operator_name) <> '')
);

create table if not exists public.equipment_incidents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  plant_asset_id uuid references public.plant_assets(id) on delete cascade,
  equipment_name text,
  incident_date date not null,
  incident_time time,
  anomaly_description text not null,
  corrective_action text not null,
  downtime text,
  maintenance_done_by text,
  observations text,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_incidents_target_check check (
    vehicle_id is null or plant_asset_id is null
  ),
  constraint equipment_incidents_anomaly_check check (btrim(anomaly_description) <> ''),
  constraint equipment_incidents_action_check check (btrim(corrective_action) <> '')
);

create table if not exists public.equipment_maintenance_checks (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  plant_asset_id uuid references public.plant_assets(id) on delete cascade,
  equipment_name text,
  review_date date not null,
  inspection_type text not null,
  reviewed_component text not null,
  general_status_observations text,
  next_review_date date not null,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint equipment_maintenance_checks_target_check check (
    vehicle_id is null or plant_asset_id is null
  ),
  constraint equipment_maintenance_checks_type_check check (inspection_type in ('preventiva', 'predictiva', 'calibracion')),
  constraint equipment_maintenance_checks_component_check check (btrim(reviewed_component) <> '')
);

alter table public.equipment_daily_operations
  add column if not exists vehicle_id uuid references public.vehicles(id) on delete cascade,
  add column if not exists plant_asset_id uuid references public.plant_assets(id) on delete cascade,
  add column if not exists equipment_name text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.equipment_incidents
  add column if not exists vehicle_id uuid references public.vehicles(id) on delete cascade,
  add column if not exists plant_asset_id uuid references public.plant_assets(id) on delete cascade,
  add column if not exists equipment_name text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.equipment_maintenance_checks
  add column if not exists vehicle_id uuid references public.vehicles(id) on delete cascade,
  add column if not exists plant_asset_id uuid references public.plant_assets(id) on delete cascade,
  add column if not exists equipment_name text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'equipment_daily_operations'
      and column_name = 'equipment_id'
  ) then
    alter table public.equipment_daily_operations alter column equipment_id drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'equipment_incidents'
      and column_name = 'equipment_id'
  ) then
    alter table public.equipment_incidents alter column equipment_id drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'equipment_maintenance_checks'
      and column_name = 'equipment_id'
  ) then
    alter table public.equipment_maintenance_checks alter column equipment_id drop not null;
  end if;
end;
$$;

alter table public.equipment_daily_operations
  drop constraint if exists equipment_daily_operations_target_check;
alter table public.equipment_daily_operations
  add constraint equipment_daily_operations_target_check check (
    vehicle_id is null or plant_asset_id is null
  ) not valid;

alter table public.equipment_incidents
  drop constraint if exists equipment_incidents_target_check;
alter table public.equipment_incidents
  add constraint equipment_incidents_target_check check (
    vehicle_id is null or plant_asset_id is null
  ) not valid;

alter table public.equipment_maintenance_checks
  drop constraint if exists equipment_maintenance_checks_target_check;
alter table public.equipment_maintenance_checks
  add constraint equipment_maintenance_checks_target_check check (
    vehicle_id is null or plant_asset_id is null
  ) not valid;

alter table public.equipment_maintenance_checks
  drop constraint if exists equipment_maintenance_checks_inspection_type_check,
  drop constraint if exists equipment_maintenance_checks_type_check;
alter table public.equipment_maintenance_checks
  add constraint equipment_maintenance_checks_type_check check (
    inspection_type in ('preventiva', 'predictiva', 'calibracion')
  ) not valid;

create index if not exists equipment_daily_operations_vehicle_date_idx
  on public.equipment_daily_operations (vehicle_id, operation_date desc);
create index if not exists equipment_daily_operations_plant_date_idx
  on public.equipment_daily_operations (plant_asset_id, operation_date desc);
create index if not exists equipment_incidents_vehicle_date_idx
  on public.equipment_incidents (vehicle_id, incident_date desc);
create index if not exists equipment_incidents_plant_date_idx
  on public.equipment_incidents (plant_asset_id, incident_date desc);
create index if not exists equipment_maintenance_checks_vehicle_review_idx
  on public.equipment_maintenance_checks (vehicle_id, review_date desc);
create index if not exists equipment_maintenance_checks_plant_review_idx
  on public.equipment_maintenance_checks (plant_asset_id, review_date desc);
create index if not exists equipment_maintenance_checks_next_review_idx
  on public.equipment_maintenance_checks (next_review_date);

drop trigger if exists set_equipment_daily_operations_updated_at on public.equipment_daily_operations;
create trigger set_equipment_daily_operations_updated_at
before update on public.equipment_daily_operations
for each row
execute function public.set_equipment_log_updated_at();

drop trigger if exists set_equipment_incidents_updated_at on public.equipment_incidents;
create trigger set_equipment_incidents_updated_at
before update on public.equipment_incidents
for each row
execute function public.set_equipment_log_updated_at();

drop trigger if exists set_equipment_maintenance_checks_updated_at on public.equipment_maintenance_checks;
create trigger set_equipment_maintenance_checks_updated_at
before update on public.equipment_maintenance_checks
for each row
execute function public.set_equipment_log_updated_at();

alter table public.equipment_daily_operations enable row level security;
alter table public.equipment_incidents enable row level security;
alter table public.equipment_maintenance_checks enable row level security;

drop policy if exists "Equipment daily operations select authenticated" on public.equipment_daily_operations;
drop policy if exists "Equipment daily operations insert authenticated" on public.equipment_daily_operations;
drop policy if exists "Equipment daily operations update owner or admin" on public.equipment_daily_operations;
drop policy if exists "Equipment daily operations delete admin only" on public.equipment_daily_operations;

create policy "Equipment daily operations select authenticated"
  on public.equipment_daily_operations
  for select
  to authenticated
  using (auth.uid() is not null);

create policy "Equipment daily operations insert authenticated"
  on public.equipment_daily_operations
  for insert
  to authenticated
  with check (auth.uid() is not null and (created_by is null or created_by = auth.uid()));

create policy "Equipment daily operations update owner or admin"
  on public.equipment_daily_operations
  for update
  to authenticated
  using (created_by = auth.uid() or public.app_is_admin(auth.uid()))
  with check (created_by = auth.uid() or public.app_is_admin(auth.uid()));

create policy "Equipment daily operations delete admin only"
  on public.equipment_daily_operations
  for delete
  to authenticated
  using (public.app_is_admin(auth.uid()));

drop policy if exists "Equipment incidents select authenticated" on public.equipment_incidents;
drop policy if exists "Equipment incidents insert authenticated" on public.equipment_incidents;
drop policy if exists "Equipment incidents update owner or admin" on public.equipment_incidents;
drop policy if exists "Equipment incidents delete admin only" on public.equipment_incidents;

create policy "Equipment incidents select authenticated"
  on public.equipment_incidents
  for select
  to authenticated
  using (auth.uid() is not null);

create policy "Equipment incidents insert authenticated"
  on public.equipment_incidents
  for insert
  to authenticated
  with check (auth.uid() is not null and (created_by is null or created_by = auth.uid()));

create policy "Equipment incidents update owner or admin"
  on public.equipment_incidents
  for update
  to authenticated
  using (created_by = auth.uid() or public.app_is_admin(auth.uid()))
  with check (created_by = auth.uid() or public.app_is_admin(auth.uid()));

create policy "Equipment incidents delete admin only"
  on public.equipment_incidents
  for delete
  to authenticated
  using (public.app_is_admin(auth.uid()));

drop policy if exists "Equipment maintenance checks select authenticated" on public.equipment_maintenance_checks;
drop policy if exists "Equipment maintenance checks insert authenticated" on public.equipment_maintenance_checks;
drop policy if exists "Equipment maintenance checks update owner or admin" on public.equipment_maintenance_checks;
drop policy if exists "Equipment maintenance checks delete admin only" on public.equipment_maintenance_checks;

create policy "Equipment maintenance checks select authenticated"
  on public.equipment_maintenance_checks
  for select
  to authenticated
  using (auth.uid() is not null);

create policy "Equipment maintenance checks insert authenticated"
  on public.equipment_maintenance_checks
  for insert
  to authenticated
  with check (auth.uid() is not null and (created_by is null or created_by = auth.uid()));

create policy "Equipment maintenance checks update owner or admin"
  on public.equipment_maintenance_checks
  for update
  to authenticated
  using (created_by = auth.uid() or public.app_is_admin(auth.uid()))
  with check (created_by = auth.uid() or public.app_is_admin(auth.uid()));

create policy "Equipment maintenance checks delete admin only"
  on public.equipment_maintenance_checks
  for delete
  to authenticated
  using (public.app_is_admin(auth.uid()));

grant select, insert, update, delete on public.equipment_daily_operations to authenticated;
grant select, insert, update, delete on public.equipment_incidents to authenticated;
grant select, insert, update, delete on public.equipment_maintenance_checks to authenticated;

notify pgrst, 'reload schema';
