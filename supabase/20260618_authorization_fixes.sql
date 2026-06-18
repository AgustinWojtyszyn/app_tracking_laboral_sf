-- Authorization hardening for jobs, bulk deletes and group join requests.

create or replace function public.app_is_admin(check_user_id uuid default auth.uid())
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
      and u.role = 'admin'
      and u.deleted_at is null
  );
$$;

create or replace function public.app_is_group_member(check_group_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = check_group_id
      and gm.user_id = check_user_id
  );
$$;

create or replace function public.app_is_group_creator(check_group_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = check_group_id
      and g.created_by = check_user_id
  );
$$;

revoke all on function public.app_is_admin(uuid) from public, anon;
revoke all on function public.app_is_group_member(uuid, uuid) from public, anon;
revoke all on function public.app_is_group_creator(uuid, uuid) from public, anon;
grant execute on function public.app_is_admin(uuid) to authenticated;
grant execute on function public.app_is_group_member(uuid, uuid) to authenticated;
grant execute on function public.app_is_group_creator(uuid, uuid) to authenticated;

alter table public.jobs enable row level security;

drop policy if exists "Jobs select allowed by ownership group or admin" on public.jobs;
create policy "Jobs select allowed by ownership group or admin"
  on public.jobs
  for select
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or user_id = auth.uid()
    or (group_id is not null and public.app_is_group_member(group_id, auth.uid()))
  );

drop policy if exists "Jobs insert only in own groups or admin" on public.jobs;
create policy "Jobs insert only in own groups or admin"
  on public.jobs
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.app_is_admin(auth.uid())
      or (group_id is not null and public.app_is_group_member(group_id, auth.uid()))
    )
  );

drop policy if exists "Jobs update allowed by owner editable group or admin" on public.jobs;
create policy "Jobs update allowed by owner editable group or admin"
  on public.jobs
  for update
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or user_id = auth.uid()
    or (
      editable_by_group is true
      and group_id is not null
      and public.app_is_group_member(group_id, auth.uid())
    )
  )
  with check (
    public.app_is_admin(auth.uid())
    or user_id = auth.uid()
    or (
      editable_by_group is true
      and group_id is not null
      and public.app_is_group_member(group_id, auth.uid())
    )
  );

drop policy if exists "Jobs delete allowed by owner or admin" on public.jobs;
create policy "Jobs delete allowed by owner or admin"
  on public.jobs
  for delete
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or user_id = auth.uid()
  );

create or replace function public.bulk_delete_jobs(
  p_start_date date,
  p_end_date date,
  p_status text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not public.app_is_admin(auth.uid()) then
    raise exception 'Only administrators can delete jobs in bulk' using errcode = '42501';
  end if;

  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'Invalid date range' using errcode = '22007';
  end if;

  if p_status not in ('completed', 'pending') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;

  delete from public.jobs
  where status = p_status
    and date >= p_start_date
    and date <= p_end_date;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.bulk_delete_jobs(date, date, text) from public, anon;
grant execute on function public.bulk_delete_jobs(date, date, text) to authenticated;

alter table public.group_join_requests enable row level security;

drop policy if exists "Join requests insert own pending" on public.group_join_requests;
create policy "Join requests insert own pending"
  on public.group_join_requests
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
  );

drop policy if exists "Join requests select own creator or admin" on public.group_join_requests;
create policy "Join requests select own creator or admin"
  on public.group_join_requests
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.app_is_admin(auth.uid())
    or public.app_is_group_creator(group_id, auth.uid())
  );

drop policy if exists "Join requests update creator or admin" on public.group_join_requests;
create policy "Join requests update creator or admin"
  on public.group_join_requests
  for update
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or public.app_is_group_creator(group_id, auth.uid())
  )
  with check (
    public.app_is_admin(auth.uid())
    or public.app_is_group_creator(group_id, auth.uid())
  );

drop policy if exists "Join requests delete creator or admin" on public.group_join_requests;
create policy "Join requests delete creator or admin"
  on public.group_join_requests
  for delete
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or public.app_is_group_creator(group_id, auth.uid())
  );

create or replace function public.list_group_join_requests(p_group_id uuid)
returns table (
  id uuid,
  group_id uuid,
  user_id uuid,
  status text,
  created_at timestamptz,
  user_email text,
  user_full_name text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_group_id is null then
    raise exception 'Missing group id' using errcode = '22023';
  end if;

  if not (
    public.app_is_admin(auth.uid())
    or public.app_is_group_creator(p_group_id, auth.uid())
  ) then
    raise exception 'Only group creators can list join requests' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    r.group_id,
    r.user_id,
    r.status::text,
    r.created_at,
    u.email as user_email,
    u.full_name as user_full_name
  from public.group_join_requests r
  left join public.users u on u.id = r.user_id
  where r.group_id = p_group_id
    and r.status = 'pending'
  order by r.created_at asc;
end;
$$;

create or replace function public.respond_to_group_join_request(
  p_request_id uuid,
  p_accept boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.group_join_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_request_id is null or p_accept is null then
    raise exception 'Invalid request' using errcode = '22023';
  end if;

  select *
  into request_row
  from public.group_join_requests
  where id = p_request_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Join request not found' using errcode = 'P0002';
  end if;

  if not (
    public.app_is_admin(auth.uid())
    or public.app_is_group_creator(request_row.group_id, auth.uid())
  ) then
    raise exception 'Only group creators can process join requests' using errcode = '42501';
  end if;

  if p_accept then
    insert into public.group_members (group_id, user_id)
    values (request_row.group_id, request_row.user_id)
    on conflict do nothing;

    update public.group_join_requests
    set status = 'approved'
    where id = request_row.id;
  else
    update public.group_join_requests
    set status = 'rejected'
    where id = request_row.id;
  end if;

  return true;
end;
$$;

create or replace function public.delete_group_join_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.group_join_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_request_id is null then
    raise exception 'Invalid request' using errcode = '22023';
  end if;

  select *
  into request_row
  from public.group_join_requests
  where id = p_request_id;

  if not found then
    raise exception 'Join request not found' using errcode = 'P0002';
  end if;

  if not (
    public.app_is_admin(auth.uid())
    or public.app_is_group_creator(request_row.group_id, auth.uid())
  ) then
    raise exception 'Only group creators can delete join requests' using errcode = '42501';
  end if;

  delete from public.group_join_requests
  where id = p_request_id;

  return true;
end;
$$;

revoke all on function public.list_group_join_requests(uuid) from public, anon;
revoke all on function public.respond_to_group_join_request(uuid, boolean) from public, anon;
revoke all on function public.delete_group_join_request(uuid) from public, anon;
grant execute on function public.list_group_join_requests(uuid) to authenticated;
grant execute on function public.respond_to_group_join_request(uuid, boolean) to authenticated;
grant execute on function public.delete_group_join_request(uuid) to authenticated;
