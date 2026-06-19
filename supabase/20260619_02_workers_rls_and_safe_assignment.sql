-- Add minimal worker ownership and enforce worker RLS.
--
-- Existing workers are left with group_id = null. Those legacy rows are
-- intentionally visible/manageable only by admins until they are assigned to a
-- group manually. The current UI does not provide group selection when creating
-- a worker, so non-admin inserts without group_id are rejected by RLS.

alter table public.workers
  add column if not exists group_id uuid;

alter table public.workers
  add column if not exists created_by uuid default auth.uid();

alter table public.workers
  add column if not exists created_at timestamptz default now();

alter table public.workers
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'workers_group_id_fkey'
      and conrelid = 'public.workers'::regclass
  ) then
    alter table public.workers
      add constraint workers_group_id_fkey
      foreign key (group_id)
      references public.groups(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'workers_created_by_fkey'
      and conrelid = 'public.workers'::regclass
  ) then
    alter table public.workers
      add constraint workers_created_by_fkey
      foreign key (created_by)
      references public.users(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists workers_group_id_idx
  on public.workers (group_id);

create or replace function public.set_workers_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_workers_updated_at on public.workers;
create trigger set_workers_updated_at
before update on public.workers
for each row
execute function public.set_workers_updated_at();

alter table public.workers enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workers'
  loop
    execute format('drop policy if exists %I on public.workers', policy_row.policyname);
  end loop;
end;
$$;

create policy "Workers select by group membership or admin"
  on public.workers
  for select
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or (
      group_id is not null
      and public.app_is_group_member(group_id, auth.uid())
    )
  );

create policy "Workers insert by group membership or admin"
  on public.workers
  for insert
  to authenticated
  with check (
    (
      public.app_is_admin(auth.uid())
      and (
        created_by is null
        or created_by = auth.uid()
        or exists (
          select 1
          from public.users u
          where u.id = created_by
            and u.deleted_at is null
        )
      )
    )
    or (
      group_id is not null
      and created_by = auth.uid()
      and public.app_is_group_member(group_id, auth.uid())
    )
  );

create policy "Workers update by group membership or admin"
  on public.workers
  for update
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or (
      group_id is not null
      and public.app_is_group_member(group_id, auth.uid())
    )
  )
  with check (
    public.app_is_admin(auth.uid())
    or (
      group_id is not null
      and public.app_is_group_member(group_id, auth.uid())
    )
  );

create policy "Workers delete by group membership or admin"
  on public.workers
  for delete
  to authenticated
  using (
    public.app_is_admin(auth.uid())
    or (
      group_id is not null
      and public.app_is_group_member(group_id, auth.uid())
    )
  );

create or replace function public.app_worker_can_be_assigned(
  p_worker_id uuid,
  p_group_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    p_worker_id is null
    or public.app_is_admin(p_user_id)
    or exists (
      select 1
      from public.workers w
      where w.id = p_worker_id
        and w.is_active is true
        and w.group_id is not null
        and w.group_id = p_group_id
        and public.app_is_group_member(w.group_id, p_user_id)
    );
$$;

revoke all on function public.app_worker_can_be_assigned(uuid, uuid, uuid) from public, anon;
grant execute on function public.app_worker_can_be_assigned(uuid, uuid, uuid) to authenticated;

create or replace function public.enforce_job_worker_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if TG_OP = 'UPDATE'
    and new.worker_id is not distinct from old.worker_id
    and new.group_id is not distinct from old.group_id
  then
    return new;
  end if;

  if new.worker_id is not null
    and not public.app_worker_can_be_assigned(new.worker_id, new.group_id, auth.uid())
  then
    raise exception 'Worker is not assignable to this job' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_job_worker_assignment on public.jobs;
create trigger enforce_job_worker_assignment
before insert or update of worker_id, group_id on public.jobs
for each row
execute function public.enforce_job_worker_assignment();
