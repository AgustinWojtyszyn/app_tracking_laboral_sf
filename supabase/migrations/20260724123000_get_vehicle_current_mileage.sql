-- Centralized read-only current mileage lookup for vehicles.

create or replace function public.get_vehicle_current_mileage(p_vehicle_id uuid)
returns integer
language sql
stable
security invoker
set search_path to 'pg_catalog', 'public'
as $$
  select max(reading.mileage_value)::integer
  from (
    select v.mileage_start as mileage_value
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.mileage_start is not null

    union all

    select v.mileage_end as mileage_value
    from public.vehicles v
    where v.id = p_vehicle_id
      and v.mileage_end is not null

    union all

    select r.mileage_start as mileage_value
    from public.vehicle_daily_routes r
    where r.vehicle_id = p_vehicle_id
      and r.mileage_start is not null

    union all

    select r.mileage_end as mileage_value
    from public.vehicle_daily_routes r
    where r.vehicle_id = p_vehicle_id
      and r.mileage_end is not null

    union all

    select f.mileage as mileage_value
    from public.vehicle_fuel_loads f
    where f.vehicle_id = p_vehicle_id
      and f.mileage is not null

    union all

    select m.mileage as mileage_value
    from public.vehicle_maintenance_logs m
    where m.vehicle_id = p_vehicle_id
      and m.mileage is not null
  ) reading;
$$;

revoke all on function public.get_vehicle_current_mileage(uuid) from public, anon;
grant execute on function public.get_vehicle_current_mileage(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
