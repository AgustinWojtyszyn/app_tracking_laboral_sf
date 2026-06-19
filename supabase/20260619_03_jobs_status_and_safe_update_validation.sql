-- Validate job statuses at the database/RPC boundary and keep safe_update_job
-- from assigning workers across groups.
--
-- Valid job statuses are:
--   pending
--   completed
--   archived
--
-- bulk_delete_jobs remains limited to pending/completed. Archived records are
-- valid but not bulk-deletable from the current cleanup actions.

update public.jobs
set status = case
  when lower(coalesce(status, '')) in ('pending', 'pendiente') then 'pending'
  when lower(coalesce(status, '')) in ('completed', 'completado') then 'completed'
  when lower(coalesce(status, '')) in ('archived', 'archivado') then 'archived'
  else 'pending'
end
where status is null
  or status not in ('pending', 'completed', 'archived');

alter table public.jobs
  drop constraint if exists jobs_status_valid;

alter table public.jobs
  add constraint jobs_status_valid
  check (status is not null and status in ('pending', 'completed', 'archived'));

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
  next_status text;
  next_worker_id uuid;
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

  if p_updates ? 'status' then
    next_status := p_updates ->> 'status';
    if next_status is null or next_status not in ('pending', 'completed', 'archived') then
      raise exception 'Invalid job status: %', next_status using errcode = '22023';
    end if;
  end if;

  if p_updates ? 'worker_id' then
    next_worker_id := nullif(p_updates ->> 'worker_id', '')::uuid;
    if not public.app_worker_can_be_assigned(next_worker_id, job_row.group_id, auth.uid()) then
      raise exception 'Worker is not assignable to this job' using errcode = '42501';
    end if;
  end if;

  update public.jobs
  set
    date = case when p_updates ? 'date' then nullif(p_updates ->> 'date', '')::date else date end,
    title = case when p_updates ? 'title' then nullif(trim(p_updates ->> 'title'), '') else title end,
    location = case when p_updates ? 'location' then coalesce(p_updates ->> 'location', '') else location end,
    requested_by = case when p_updates ? 'requested_by' then coalesce(p_updates ->> 'requested_by', '') else requested_by end,
    description = case when p_updates ? 'description' then coalesce(p_updates ->> 'description', '') else description end,
    status = case when p_updates ? 'status' then next_status else status end,
    worker_id = case when p_updates ? 'worker_id' then next_worker_id else worker_id end,
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

revoke all on function public.safe_update_job(uuid, jsonb) from public, anon;
grant execute on function public.safe_update_job(uuid, jsonb) to authenticated;
