-- Vehicle tracking module: routes, driver maintenance requests, document expirations and fuel load hardening.

create extension if not exists pgcrypto;

alter table public.vehicle_fuel_loads
  alter column vehicle_id drop not null,
  alter column estimated_time drop not null,
  alter column mileage drop not null;

alter table public.vehicle_maintenance_logs
  alter column vehicle_id drop not null;

alter table public.vehicle_fuel_loads
  drop constraint if exists vehicle_fuel_loads_vehicle_id_fkey;
alter table public.vehicle_fuel_loads
  add constraint vehicle_fuel_loads_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(id) on delete set null;

alter table public.vehicle_maintenance_logs
  drop constraint if exists vehicle_maintenance_logs_vehicle_id_fkey;
alter table public.vehicle_maintenance_logs
  add constraint vehicle_maintenance_logs_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(id) on delete set null;

alter table public.equipment_daily_operations
  drop constraint if exists equipment_daily_operations_vehicle_id_fkey,
  drop constraint if exists equipment_daily_operations_plant_asset_id_fkey;
alter table public.equipment_daily_operations
  add constraint equipment_daily_operations_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(id) on delete set null,
  add constraint equipment_daily_operations_plant_asset_id_fkey
  foreign key (plant_asset_id) references public.plant_assets(id) on delete set null;

alter table public.equipment_incidents
  drop constraint if exists equipment_incidents_vehicle_id_fkey,
  drop constraint if exists equipment_incidents_plant_asset_id_fkey;
alter table public.equipment_incidents
  add constraint equipment_incidents_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(id) on delete set null,
  add constraint equipment_incidents_plant_asset_id_fkey
  foreign key (plant_asset_id) references public.plant_assets(id) on delete set null;

alter table public.equipment_maintenance_checks
  drop constraint if exists equipment_maintenance_checks_vehicle_id_fkey,
  drop constraint if exists equipment_maintenance_checks_plant_asset_id_fkey;
alter table public.equipment_maintenance_checks
  add constraint equipment_maintenance_checks_vehicle_id_fkey
  foreign key (vehicle_id) references public.vehicles(id) on delete set null,
  add constraint equipment_maintenance_checks_plant_asset_id_fkey
  foreign key (plant_asset_id) references public.plant_assets(id) on delete set null;

create table if not exists public.vehicle_daily_routes (
  id uuid primary key default gen_random_uuid(),
  route_date date not null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  mileage_start integer not null,
  mileage_end integer not null,
  kilometers_traveled integer generated always as (mileage_end - mileage_start) stored,
  visited_places text[] not null default '{}',
  observations text,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_daily_routes_mileage_start_check check (mileage_start >= 0 and mileage_start <= 999999999),
  constraint vehicle_daily_routes_mileage_end_check check (mileage_end >= 0 and mileage_end <= 999999999),
  constraint vehicle_daily_routes_mileage_range_check check (mileage_end >= mileage_start),
  constraint vehicle_daily_routes_places_check check (array_length(visited_places, 1) is not null)
);

create table if not exists public.vehicle_maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  request_date date not null,
  issue_type text not null,
  description text not null,
  current_mileage integer,
  priority text not null default 'media',
  status text not null default 'pendiente',
  admin_notes text,
  resolved_at date,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_maintenance_requests_issue_check check (btrim(issue_type) <> ''),
  constraint vehicle_maintenance_requests_description_check check (btrim(description) <> ''),
  constraint vehicle_maintenance_requests_mileage_check check (current_mileage is null or (current_mileage >= 0 and current_mileage <= 999999999)),
  constraint vehicle_maintenance_requests_priority_check check (priority in ('baja', 'media', 'alta')),
  constraint vehicle_maintenance_requests_status_check check (status in ('pendiente', 'en_revision', 'programado', 'realizado', 'cancelado'))
);

create table if not exists public.vehicle_document_expirations (
  id uuid primary key default gen_random_uuid(),
  document_type text not null,
  custom_document_name text,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  expires_at date not null,
  observations text,
  status text not null default 'vigente',
  last_notified_at timestamptz,
  last_alert_level text,
  created_by uuid references public.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_document_expirations_type_check check (document_type in ('seguro', 'rto', 'licencia', 'otro')),
  constraint vehicle_document_expirations_owner_check check (vehicle_id is not null or driver_id is not null),
  constraint vehicle_document_expirations_status_check check (status in ('vigente', 'proximo_a_vencer', 'vencido'))
);

create index if not exists vehicle_daily_routes_date_idx on public.vehicle_daily_routes (route_date desc);
create index if not exists vehicle_daily_routes_vehicle_idx on public.vehicle_daily_routes (vehicle_id, route_date desc);
create index if not exists vehicle_daily_routes_driver_idx on public.vehicle_daily_routes (driver_id, route_date desc);
create index if not exists vehicle_maintenance_requests_date_idx on public.vehicle_maintenance_requests (request_date desc);
create index if not exists vehicle_maintenance_requests_vehicle_idx on public.vehicle_maintenance_requests (vehicle_id);
create index if not exists vehicle_maintenance_requests_driver_idx on public.vehicle_maintenance_requests (driver_id);
create index if not exists vehicle_maintenance_requests_status_idx on public.vehicle_maintenance_requests (status);
create index if not exists vehicle_maintenance_requests_priority_idx on public.vehicle_maintenance_requests (priority);
create index if not exists vehicle_document_expirations_expires_idx on public.vehicle_document_expirations (expires_at);
create index if not exists vehicle_document_expirations_vehicle_idx on public.vehicle_document_expirations (vehicle_id);
create index if not exists vehicle_document_expirations_driver_idx on public.vehicle_document_expirations (driver_id);
create index if not exists vehicle_document_expirations_status_idx on public.vehicle_document_expirations (status);

drop trigger if exists set_vehicle_daily_routes_updated_at on public.vehicle_daily_routes;
create trigger set_vehicle_daily_routes_updated_at
before update on public.vehicle_daily_routes
for each row execute function public.set_equipment_log_updated_at();

drop trigger if exists set_vehicle_maintenance_requests_updated_at on public.vehicle_maintenance_requests;
create trigger set_vehicle_maintenance_requests_updated_at
before update on public.vehicle_maintenance_requests
for each row execute function public.set_equipment_log_updated_at();

drop trigger if exists set_vehicle_document_expirations_updated_at on public.vehicle_document_expirations;
create trigger set_vehicle_document_expirations_updated_at
before update on public.vehicle_document_expirations
for each row execute function public.set_equipment_log_updated_at();

alter table public.vehicle_daily_routes enable row level security;
alter table public.vehicle_maintenance_requests enable row level security;
alter table public.vehicle_document_expirations enable row level security;

drop policy if exists "Vehicle fuel loads insert admin or driver" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads update admin or driver" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads insert admin only" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads update admin only" on public.vehicle_fuel_loads;
create policy "Vehicle fuel loads insert admin only"
  on public.vehicle_fuel_loads for insert to authenticated
  with check (public.app_is_admin(auth.uid()) and (created_by is null or created_by = auth.uid()));
create policy "Vehicle fuel loads update admin only"
  on public.vehicle_fuel_loads for update to authenticated
  using (public.app_is_admin(auth.uid())) with check (public.app_is_admin(auth.uid()));

drop policy if exists "Vehicle daily routes select admin or driver" on public.vehicle_daily_routes;
drop policy if exists "Vehicle daily routes insert admin or driver" on public.vehicle_daily_routes;
drop policy if exists "Vehicle daily routes update admin or owner driver" on public.vehicle_daily_routes;
drop policy if exists "Vehicle daily routes delete admin only" on public.vehicle_daily_routes;
create policy "Vehicle daily routes select admin or driver"
  on public.vehicle_daily_routes for select to authenticated
  using (
    public.app_is_admin(auth.uid())
    or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
    or created_by = auth.uid()
  );
create policy "Vehicle daily routes insert admin or driver"
  on public.vehicle_daily_routes for insert to authenticated
  with check (
    (public.app_is_admin(auth.uid()) or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()))
    and (created_by is null or created_by = auth.uid())
  );
create policy "Vehicle daily routes update admin or owner driver"
  on public.vehicle_daily_routes for update to authenticated
  using (public.app_is_admin(auth.uid()) or created_by = auth.uid())
  with check (public.app_is_admin(auth.uid()) or created_by = auth.uid());
create policy "Vehicle daily routes delete admin only"
  on public.vehicle_daily_routes for delete to authenticated
  using (public.app_is_admin(auth.uid()));

drop policy if exists "Vehicle maintenance requests select admin or driver" on public.vehicle_maintenance_requests;
drop policy if exists "Vehicle maintenance requests insert admin or driver" on public.vehicle_maintenance_requests;
drop policy if exists "Vehicle maintenance requests update admin or owner driver" on public.vehicle_maintenance_requests;
drop policy if exists "Vehicle maintenance requests delete admin only" on public.vehicle_maintenance_requests;
create policy "Vehicle maintenance requests select admin or driver"
  on public.vehicle_maintenance_requests for select to authenticated
  using (
    public.app_is_admin(auth.uid())
    or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
    or created_by = auth.uid()
  );
create policy "Vehicle maintenance requests insert admin or driver"
  on public.vehicle_maintenance_requests for insert to authenticated
  with check (
    (public.app_is_admin(auth.uid()) or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()))
    and (created_by is null or created_by = auth.uid())
  );
create policy "Vehicle maintenance requests update admin or owner driver"
  on public.vehicle_maintenance_requests for update to authenticated
  using (public.app_is_admin(auth.uid()) or created_by = auth.uid())
  with check (public.app_is_admin(auth.uid()) or created_by = auth.uid());
create policy "Vehicle maintenance requests delete admin only"
  on public.vehicle_maintenance_requests for delete to authenticated
  using (public.app_is_admin(auth.uid()));

drop policy if exists "Vehicle document expirations select admin or related driver" on public.vehicle_document_expirations;
drop policy if exists "Vehicle document expirations insert admin only" on public.vehicle_document_expirations;
drop policy if exists "Vehicle document expirations update admin only" on public.vehicle_document_expirations;
drop policy if exists "Vehicle document expirations delete admin only" on public.vehicle_document_expirations;
create policy "Vehicle document expirations select admin or related driver"
  on public.vehicle_document_expirations for select to authenticated
  using (
    public.app_is_admin(auth.uid())
    or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
  );
create policy "Vehicle document expirations insert admin only"
  on public.vehicle_document_expirations for insert to authenticated
  with check (public.app_is_admin(auth.uid()) and (created_by is null or created_by = auth.uid()));
create policy "Vehicle document expirations update admin only"
  on public.vehicle_document_expirations for update to authenticated
  using (public.app_is_admin(auth.uid())) with check (public.app_is_admin(auth.uid()));
create policy "Vehicle document expirations delete admin only"
  on public.vehicle_document_expirations for delete to authenticated
  using (public.app_is_admin(auth.uid()));

create or replace function public.vehicle_document_alert_candidates()
returns table (
  id uuid,
  document_type text,
  custom_document_name text,
  vehicle_label text,
  driver_label text,
  expires_at date,
  days_remaining integer,
  alert_level text,
  observations text
)
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select
      e.id,
      e.document_type,
      e.custom_document_name,
      concat_ws(' - ', v.license_plate, coalesce(v.name, v.brand), v.model) as vehicle_label,
      d.name as driver_label,
      e.expires_at,
      (e.expires_at - current_date)::integer as days_remaining,
      e.observations,
      e.last_alert_level,
      case
        when e.expires_at < current_date then 'vencido'
        when e.expires_at - current_date <= 1 then '1'
        when e.expires_at - current_date <= 7 then '7'
        when e.expires_at - current_date <= 15 then '15'
        when e.expires_at - current_date <= 30 then '30'
        else null
      end as next_alert_level
    from public.vehicle_document_expirations e
    left join public.vehicles v on v.id = e.vehicle_id
    left join public.drivers d on d.id = e.driver_id
    where e.expires_at <= current_date + 30
  )
  select
    c.id,
    c.document_type,
    c.custom_document_name,
    nullif(c.vehicle_label, '') as vehicle_label,
    c.driver_label,
    c.expires_at,
    c.days_remaining,
    c.next_alert_level as alert_level,
    c.observations
  from candidates c
  where c.next_alert_level is not null
    and c.next_alert_level is distinct from c.last_alert_level;
$$;

revoke all on function public.vehicle_document_alert_candidates() from public, anon, authenticated;
grant execute on function public.vehicle_document_alert_candidates() to service_role;

grant select, insert, update, delete on public.vehicle_daily_routes to authenticated;
grant select, insert, update, delete on public.vehicle_maintenance_requests to authenticated;
grant select, insert, update, delete on public.vehicle_document_expirations to authenticated;

notify pgrst, 'reload schema';
