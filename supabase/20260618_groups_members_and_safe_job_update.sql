-- Hardening for group management and safe job updates.

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_members'
  loop
    execute format('drop policy if exists %I on public.group_members', policy_row.policyname);
  end loop;
end;
$$;

drop policy if exists "Groups readable by authenticated users" on public.groups;
create policy "Groups readable by authenticated users"
  on public.groups
  for select
  to authenticated
  using (true);

drop policy if exists "Groups insert own creator" on public.groups;
create policy "Groups insert own creator"
  on public.groups
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Groups update creator or admin" on public.groups;
create policy "Groups update creator or admin"
  on public.groups
  for update
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or created_by = auth.uid()
  )
  with check (
    public.app_is_admin(auth.uid())
    or created_by = auth.uid()
  );

drop policy if exists "Groups update restrictive creator or admin" on public.groups;
create policy "Groups update restrictive creator or admin"
  on public.groups
  as restrictive
  for update
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or created_by = auth.uid()
  )
  with check (
    public.app_is_admin(auth.uid())
    or created_by = auth.uid()
  );

drop policy if exists "Groups delete creator or admin" on public.groups;
create policy "Groups delete creator or admin"
  on public.groups
  for delete
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or created_by = auth.uid()
  );

drop policy if exists "Groups delete restrictive creator or admin" on public.groups;
create policy "Groups delete restrictive creator or admin"
  on public.groups
  as restrictive
  for delete
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or created_by = auth.uid()
  );

drop policy if exists "Group members readable by authenticated users" on public.group_members;
create policy "Group members readable by authenticated users"
  on public.group_members
  for select
  to authenticated
  using (true);

drop policy if exists "Group members insert creator or admin only" on public.group_members;
create policy "Group members insert creator or admin only"
  on public.group_members
  for insert
  to authenticated
  with check (
    public.app_is_admin(auth.uid())
    or public.app_is_group_creator(group_id, auth.uid())
  );

drop policy if exists "Group members insert restrictive creator or admin only" on public.group_members;
create policy "Group members insert restrictive creator or admin only"
  on public.group_members
  as restrictive
  for insert
  to authenticated
  with check (
    public.app_is_admin(auth.uid())
    or public.app_is_group_creator(group_id, auth.uid())
  );

drop policy if exists "Group members delete creator or admin only" on public.group_members;
create policy "Group members delete creator or admin only"
  on public.group_members
  for delete
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or public.app_is_group_creator(group_id, auth.uid())
  );

drop policy if exists "Group members delete restrictive creator or admin only" on public.group_members;
create policy "Group members delete restrictive creator or admin only"
  on public.group_members
  as restrictive
  for delete
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or public.app_is_group_creator(group_id, auth.uid())
  );

create or replace function public.assert_group_manager(p_group_id uuid)
returns void
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
    raise exception 'Only group creators or administrators can manage this group' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.create_group_secure(
  p_name text,
  p_description text default null
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  group_row public.groups%rowtype;
  clean_name text := nullif(trim(coalesce(p_name, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if clean_name is null then
    raise exception 'Group name is required' using errcode = '22023';
  end if;

  insert into public.groups (name, description, created_by)
  values (clean_name, nullif(trim(coalesce(p_description, '')), ''), auth.uid())
  returning * into group_row;

  insert into public.group_members (group_id, user_id)
  values (group_row.id, auth.uid())
  on conflict do nothing;

  return group_row;
end;
$$;

create or replace function public.update_group_secure(
  p_group_id uuid,
  p_name text,
  p_description text default null
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  group_row public.groups%rowtype;
  clean_name text := nullif(trim(coalesce(p_name, '')), '');
begin
  perform public.assert_group_manager(p_group_id);

  if clean_name is null then
    raise exception 'Group name is required' using errcode = '22023';
  end if;

  update public.groups
  set
    name = clean_name,
    description = nullif(trim(coalesce(p_description, '')), '')
  where id = p_group_id
  returning * into group_row;

  if not found then
    raise exception 'Group not found' using errcode = 'P0002';
  end if;

  return group_row;
end;
$$;

create or replace function public.delete_group_secure(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_group_manager(p_group_id);

  delete from public.groups
  where id = p_group_id;

  if not found then
    raise exception 'Group not found' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

create or replace function public.add_group_member_secure(
  p_group_id uuid,
  p_identifier text
)
returns table (
  user_id uuid,
  email text,
  full_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_identifier text := nullif(trim(coalesce(p_identifier, '')), '');
  target_user public.users%rowtype;
  match_count integer := 0;
begin
  perform public.assert_group_manager(p_group_id);

  if clean_identifier is null then
    raise exception 'User identifier is required' using errcode = '22023';
  end if;

  if position('@' in clean_identifier) > 0 then
    select *
    into target_user
    from public.users u
    where u.email ilike clean_identifier
      and u.deleted_at is null
    limit 1;

    select count(*)
    into match_count
    from public.users u
    where u.email ilike clean_identifier
      and u.deleted_at is null;
  else
    select *
    into target_user
    from public.users u
    where u.full_name ilike '%' || clean_identifier || '%'
      and u.deleted_at is null
    limit 1;

    select count(*)
    into match_count
    from public.users u
    where u.full_name ilike '%' || clean_identifier || '%'
      and u.deleted_at is null;
  end if;

  if match_count = 0 then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  if match_count > 1 then
    raise exception 'Multiple users found' using errcode = '21000';
  end if;

  insert into public.group_members (group_id, user_id)
  values (p_group_id, target_user.id)
  on conflict do nothing;

  return query
  select target_user.id, target_user.email, target_user.full_name;
end;
$$;

create or replace function public.remove_group_member_secure(
  p_group_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  group_owner uuid;
begin
  perform public.assert_group_manager(p_group_id);

  if p_user_id is null then
    raise exception 'Missing user id' using errcode = '22023';
  end if;

  select created_by
  into group_owner
  from public.groups
  where id = p_group_id;

  if not found then
    raise exception 'Group not found' using errcode = 'P0002';
  end if;

  if p_user_id = group_owner then
    raise exception 'Group creator cannot be removed' using errcode = '42501';
  end if;

  delete from public.group_members
  where group_id = p_group_id
    and user_id = p_user_id;

  return true;
end;
$$;

create or replace function public.safe_update_job(
  p_job_id uuid,
  p_updates jsonb
)
returns public.jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job_row public.jobs%rowtype;
  updated_row public.jobs%rowtype;
  update_key text;
  allowed_keys text[] := array[
    'date',
    'title',
    'location',
    'requested_by',
    'description',
    'status',
    'worker_id',
    'action_type',
    'sector_type',
    'sector_custom',
    'cost_spent',
    'amount_to_charge',
    'image_attachments'
  ];
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_job_id is null then
    raise exception 'Missing job id' using errcode = '22023';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'object' then
    raise exception 'Updates must be a JSON object' using errcode = '22023';
  end if;

  for update_key in select jsonb_object_keys(p_updates)
  loop
    if not update_key = any(allowed_keys) then
      raise exception 'Unknown or protected job field: %', update_key using errcode = '22023';
    end if;
  end loop;

  select *
  into job_row
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;

  if not (
    public.app_is_admin(auth.uid())
    or job_row.user_id = auth.uid()
    or (
      job_row.editable_by_group is true
      and job_row.group_id is not null
      and public.app_is_group_member(job_row.group_id, auth.uid())
    )
  ) then
    raise exception 'Not allowed to update this job' using errcode = '42501';
  end if;

  update public.jobs
  set
    date = case when p_updates ? 'date' then nullif(p_updates ->> 'date', '')::date else date end,
    title = case when p_updates ? 'title' then nullif(trim(p_updates ->> 'title'), '') else title end,
    location = case when p_updates ? 'location' then coalesce(p_updates ->> 'location', '') else location end,
    requested_by = case when p_updates ? 'requested_by' then coalesce(p_updates ->> 'requested_by', '') else requested_by end,
    description = case when p_updates ? 'description' then coalesce(p_updates ->> 'description', '') else description end,
    status = case when p_updates ? 'status' then p_updates ->> 'status' else status end,
    worker_id = case when p_updates ? 'worker_id' then nullif(p_updates ->> 'worker_id', '')::uuid else worker_id end,
    action_type = case when p_updates ? 'action_type' then nullif(p_updates ->> 'action_type', '') else action_type end,
    sector_type = case when p_updates ? 'sector_type' then nullif(p_updates ->> 'sector_type', '') else sector_type end,
    sector_custom = case when p_updates ? 'sector_custom' then nullif(p_updates ->> 'sector_custom', '') else sector_custom end,
    cost_spent = case when p_updates ? 'cost_spent' then coalesce(nullif(p_updates ->> 'cost_spent', '')::numeric, 0) else cost_spent end,
    amount_to_charge = case when p_updates ? 'amount_to_charge' then coalesce(nullif(p_updates ->> 'amount_to_charge', '')::numeric, 0) else amount_to_charge end,
    image_attachments = case when p_updates ? 'image_attachments' then p_updates -> 'image_attachments' else image_attachments end
  where id = p_job_id
  returning * into updated_row;

  return updated_row;
end;
$$;

drop policy if exists "Jobs update via safe RPC only" on public.jobs;
create policy "Jobs update via safe RPC only"
  on public.jobs
  as restrictive
  for update
  to authenticated
  using (false)
  with check (false);

revoke all on function public.assert_group_manager(uuid) from public, anon;
revoke all on function public.create_group_secure(text, text) from public, anon;
revoke all on function public.update_group_secure(uuid, text, text) from public, anon;
revoke all on function public.delete_group_secure(uuid) from public, anon;
revoke all on function public.add_group_member_secure(uuid, text) from public, anon;
revoke all on function public.remove_group_member_secure(uuid, uuid) from public, anon;
revoke all on function public.safe_update_job(uuid, jsonb) from public, anon;

grant execute on function public.create_group_secure(text, text) to authenticated;
grant execute on function public.update_group_secure(uuid, text, text) to authenticated;
grant execute on function public.delete_group_secure(uuid) to authenticated;
grant execute on function public.add_group_member_secure(uuid, text) to authenticated;
grant execute on function public.remove_group_member_secure(uuid, uuid) to authenticated;
grant execute on function public.safe_update_job(uuid, jsonb) to authenticated;
