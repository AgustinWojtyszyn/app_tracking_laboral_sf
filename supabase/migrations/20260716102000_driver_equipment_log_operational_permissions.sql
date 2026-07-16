-- Allow drivers to manage operational equipment records without granting access
-- to vehicle master data, mileage totals, drivers, plant assets or check records.

create or replace function public.prevent_driver_equipment_log_mileage_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.app_is_admin(auth.uid())
    and public.app_has_role(auth.uid(), 'chofer')
    and new.mileage is distinct from old.mileage
  then
    raise exception 'Drivers cannot update mileage values' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_driver_equipment_log_mileage_update() from public, anon;
grant execute on function public.prevent_driver_equipment_log_mileage_update() to authenticated;

drop trigger if exists prevent_driver_vehicle_fuel_load_mileage_update on public.vehicle_fuel_loads;
create trigger prevent_driver_vehicle_fuel_load_mileage_update
before update on public.vehicle_fuel_loads
for each row
execute function public.prevent_driver_equipment_log_mileage_update();

drop trigger if exists prevent_driver_vehicle_maintenance_log_mileage_update on public.vehicle_maintenance_logs;
create trigger prevent_driver_vehicle_maintenance_log_mileage_update
before update on public.vehicle_maintenance_logs
for each row
execute function public.prevent_driver_equipment_log_mileage_update();

drop policy if exists "Vehicle fuel loads insert admin only" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads insert admin or driver" on public.vehicle_fuel_loads;
create policy "Vehicle fuel loads insert admin or driver"
  on public.vehicle_fuel_loads
  for insert
  to authenticated
  with check (
    (public.app_is_admin(auth.uid()) or public.app_has_role(auth.uid(), 'chofer'))
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "Vehicle fuel loads update admin only" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads update admin or driver" on public.vehicle_fuel_loads;
create policy "Vehicle fuel loads update admin or driver"
  on public.vehicle_fuel_loads
  for update
  to authenticated
  using (public.app_is_admin(auth.uid()) or public.app_has_role(auth.uid(), 'chofer'))
  with check (public.app_is_admin(auth.uid()) or public.app_has_role(auth.uid(), 'chofer'));

drop policy if exists "Vehicle maintenance logs insert admin only" on public.vehicle_maintenance_logs;
drop policy if exists "Vehicle maintenance logs insert admin or driver" on public.vehicle_maintenance_logs;
create policy "Vehicle maintenance logs insert admin or driver"
  on public.vehicle_maintenance_logs
  for insert
  to authenticated
  with check (
    (public.app_is_admin(auth.uid()) or public.app_has_role(auth.uid(), 'chofer'))
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "Vehicle maintenance logs update admin only" on public.vehicle_maintenance_logs;
drop policy if exists "Vehicle maintenance logs update admin or driver" on public.vehicle_maintenance_logs;
create policy "Vehicle maintenance logs update admin or driver"
  on public.vehicle_maintenance_logs
  for update
  to authenticated
  using (public.app_is_admin(auth.uid()) or public.app_has_role(auth.uid(), 'chofer'))
  with check (public.app_is_admin(auth.uid()) or public.app_has_role(auth.uid(), 'chofer'));

drop policy if exists "Equipment incidents insert authenticated" on public.equipment_incidents;
drop policy if exists "Equipment incidents insert admin or driver" on public.equipment_incidents;
create policy "Equipment incidents insert admin or driver"
  on public.equipment_incidents
  for insert
  to authenticated
  with check (
    (public.app_is_admin(auth.uid()) or public.app_has_role(auth.uid(), 'chofer'))
    and (created_by is null or created_by = auth.uid())
  );

drop policy if exists "Equipment incidents update owner or admin" on public.equipment_incidents;
drop policy if exists "Equipment incidents update admin or driver" on public.equipment_incidents;
create policy "Equipment incidents update admin or driver"
  on public.equipment_incidents
  for update
  to authenticated
  using (public.app_is_admin(auth.uid()) or public.app_has_role(auth.uid(), 'chofer'))
  with check (public.app_is_admin(auth.uid()) or public.app_has_role(auth.uid(), 'chofer'));
