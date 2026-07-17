-- Minimal fix for vehicle fuel loads payload normalization.
-- The frontend sends null for empty optional time/mileage values, so the table
-- must not reject those rows before CHECK constraints are evaluated.

alter table public.vehicle_fuel_loads
  alter column estimated_time drop not null,
  alter column mileage drop not null;

alter table public.vehicle_fuel_loads
  drop constraint if exists vehicle_fuel_loads_mileage_check;

alter table public.vehicle_fuel_loads
  add constraint vehicle_fuel_loads_mileage_check
  check (mileage is null or (mileage >= 0 and mileage <= 999999999));

drop policy if exists "Vehicle fuel loads insert admin or driver" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads insert admin only" on public.vehicle_fuel_loads;
create policy "Vehicle fuel loads insert admin only"
  on public.vehicle_fuel_loads
  for insert
  to authenticated
  with check (
    public.app_is_admin(auth.uid())
    and created_by = auth.uid()
  );

notify pgrst, 'reload schema';
