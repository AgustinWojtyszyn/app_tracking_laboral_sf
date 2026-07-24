-- Prevent drivers from assigning vehicle tracking records to another driver.

drop policy if exists "Vehicle daily routes insert admin or driver" on public.vehicle_daily_routes;
drop policy if exists "Vehicle daily routes update admin or owner driver" on public.vehicle_daily_routes;
drop policy if exists "Vehicle daily routes insert admin or assigned driver" on public.vehicle_daily_routes;
drop policy if exists "Vehicle daily routes update admin or assigned driver" on public.vehicle_daily_routes;

create policy "Vehicle daily routes insert admin or assigned driver"
  on public.vehicle_daily_routes
  for insert
  to authenticated
  with check (
    (
      public.app_is_admin(auth.uid())
      or (
        public.app_has_role(auth.uid(), 'chofer')
        and exists (
          select 1
          from public.drivers d
          where d.id = driver_id
            and d.user_id = auth.uid()
        )
      )
    )
    and (created_by is null or created_by = auth.uid())
  );

create policy "Vehicle daily routes update admin or assigned driver"
  on public.vehicle_daily_routes
  for update
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or (
      created_by = auth.uid()
      and public.app_has_role(auth.uid(), 'chofer')
      and exists (
        select 1
        from public.drivers d
        where d.id = driver_id
          and d.user_id = auth.uid()
      )
    )
  )
  with check (
    public.app_is_admin(auth.uid())
    or (
      created_by = auth.uid()
      and public.app_has_role(auth.uid(), 'chofer')
      and exists (
        select 1
        from public.drivers d
        where d.id = driver_id
          and d.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Vehicle maintenance requests insert admin or driver" on public.vehicle_maintenance_requests;
drop policy if exists "Vehicle maintenance requests update admin or owner driver" on public.vehicle_maintenance_requests;
drop policy if exists "Vehicle maintenance requests insert admin or assigned driver" on public.vehicle_maintenance_requests;
drop policy if exists "Vehicle maintenance requests update admin or assigned driver" on public.vehicle_maintenance_requests;

create policy "Vehicle maintenance requests insert admin or assigned driver"
  on public.vehicle_maintenance_requests
  for insert
  to authenticated
  with check (
    (
      public.app_is_admin(auth.uid())
      or (
        public.app_has_role(auth.uid(), 'chofer')
        and exists (
          select 1
          from public.drivers d
          where d.id = driver_id
            and d.user_id = auth.uid()
        )
      )
    )
    and (created_by is null or created_by = auth.uid())
  );

create policy "Vehicle maintenance requests update admin or assigned driver"
  on public.vehicle_maintenance_requests
  for update
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or (
      created_by = auth.uid()
      and public.app_has_role(auth.uid(), 'chofer')
      and exists (
        select 1
        from public.drivers d
        where d.id = driver_id
          and d.user_id = auth.uid()
      )
    )
  )
  with check (
    public.app_is_admin(auth.uid())
    or (
      created_by = auth.uid()
      and public.app_has_role(auth.uid(), 'chofer')
      and exists (
        select 1
        from public.drivers d
        where d.id = driver_id
          and d.user_id = auth.uid()
      )
    )
  );

notify pgrst, 'reload schema';
