-- Prevent regressive confirmed odometer readings on new operational records.
-- The advisory transaction lock serializes inserts per vehicle so concurrent
-- transactions recalculate the current mileage after the previous insert commits.

create or replace function public.enforce_vehicle_mileage_not_regressive_on_insert()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  target_vehicle_id uuid;
  new_mileage integer;
  current_mileage integer;
  vehicle_lock_key bigint;
begin
  if tg_table_name = 'vehicle_fuel_loads' then
    target_vehicle_id := new.vehicle_id;
    new_mileage := new.mileage;
  elsif tg_table_name = 'vehicle_daily_routes' then
    target_vehicle_id := new.vehicle_id;
    new_mileage := new.mileage_start;
  elsif tg_table_name = 'vehicle_maintenance_logs' then
    target_vehicle_id := new.vehicle_id;
    new_mileage := new.mileage;
  else
    raise exception 'Invalid mileage validation target' using errcode = '0A000';
  end if;

  if target_vehicle_id is null or new_mileage is null then
    return new;
  end if;

  vehicle_lock_key := (
    ('x' || pg_catalog.substr(pg_catalog.replace(target_vehicle_id::text, '-', ''), 1, 16))::bit(64)::bigint
    # ('x' || pg_catalog.substr(pg_catalog.replace(target_vehicle_id::text, '-', ''), 17, 16))::bit(64)::bigint
  );

  perform pg_catalog.pg_advisory_xact_lock(vehicle_lock_key);

  select pg_catalog.max(reading.mileage_value)::integer
    into current_mileage
  from (
    select v.mileage_start as mileage_value
    from public.vehicles v
    where v.id = target_vehicle_id
      and v.mileage_start is not null

    union all

    select v.mileage_end as mileage_value
    from public.vehicles v
    where v.id = target_vehicle_id
      and v.mileage_end is not null

    union all

    select r.mileage_start as mileage_value
    from public.vehicle_daily_routes r
    where r.vehicle_id = target_vehicle_id
      and r.mileage_start is not null

    union all

    select r.mileage_end as mileage_value
    from public.vehicle_daily_routes r
    where r.vehicle_id = target_vehicle_id
      and r.mileage_end is not null

    union all

    select f.mileage as mileage_value
    from public.vehicle_fuel_loads f
    where f.vehicle_id = target_vehicle_id
      and f.mileage is not null

    union all

    select m.mileage as mileage_value
    from public.vehicle_maintenance_logs m
    where m.vehicle_id = target_vehicle_id
      and m.mileage is not null
  ) reading;

  if current_mileage is not null and new_mileage < current_mileage then
    raise exception 'Uno de los valores ingresados no es válido' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_vehicle_mileage_not_regressive_on_insert() from public, anon, authenticated;

drop trigger if exists enforce_vehicle_fuel_load_mileage_not_regressive_on_insert on public.vehicle_fuel_loads;
create trigger enforce_vehicle_fuel_load_mileage_not_regressive_on_insert
before insert on public.vehicle_fuel_loads
for each row
execute function public.enforce_vehicle_mileage_not_regressive_on_insert();

drop trigger if exists enforce_vehicle_daily_route_mileage_not_regressive_on_insert on public.vehicle_daily_routes;
create trigger enforce_vehicle_daily_route_mileage_not_regressive_on_insert
before insert on public.vehicle_daily_routes
for each row
execute function public.enforce_vehicle_mileage_not_regressive_on_insert();

drop trigger if exists enforce_vehicle_maintenance_log_mileage_not_regressive_on_insert on public.vehicle_maintenance_logs;
create trigger enforce_vehicle_maintenance_log_mileage_not_regressive_on_insert
before insert on public.vehicle_maintenance_logs
for each row
execute function public.enforce_vehicle_mileage_not_regressive_on_insert();

notify pgrst, 'reload schema';
