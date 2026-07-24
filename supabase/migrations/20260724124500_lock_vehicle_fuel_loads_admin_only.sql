-- Keep fuel loads as admin-managed records while preserving read access
-- for authenticated users.

drop policy if exists "Vehicle fuel loads select authenticated" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads insert admin or driver" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads update admin or driver" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads insert admin only" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads update admin only" on public.vehicle_fuel_loads;
drop policy if exists "Vehicle fuel loads delete admin only" on public.vehicle_fuel_loads;

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
    and created_by = auth.uid()
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

notify pgrst, 'reload schema';
