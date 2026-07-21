alter table public.jobs
  add column if not exists status text not null default 'pending';

update public.jobs
set status = case
  when lower(coalesce(status, '')) in ('pending', 'pendiente') then 'pending'
  when lower(coalesce(status, '')) in ('in_progress', 'en_proceso', 'en proceso') then 'in_progress'
  when lower(coalesce(status, '')) in ('completed', 'completado') then 'completed'
  when lower(coalesce(status, '')) in ('cancelled', 'canceled', 'cancelado', 'archived', 'archivado') then 'cancelled'
  else 'pending'
end
where status is null
  or status not in ('pending', 'in_progress', 'completed', 'cancelled');

alter table public.jobs
  alter column status set default 'pending',
  alter column status set not null;

alter table public.jobs
  drop constraint if exists jobs_status_valid;

alter table public.jobs
  add constraint jobs_status_valid
  check (status in ('pending', 'in_progress', 'completed', 'cancelled'));

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
    if next_status is null or next_status not in ('pending', 'in_progress', 'completed', 'cancelled') then
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

create or replace function public.bulk_delete_jobs(
  p_start_date date,
  p_end_date date,
  p_status text,
  p_location text default null::text,
  p_search text default null::text
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

  delete from public.jobs j
  where j.status = p_status
    and j.date >= p_start_date
    and j.date <= p_end_date
    and (
      nullif(btrim(p_location), '') is null
      or lower(btrim(j.location)) = lower(btrim(p_location))
    )
    and (
      nullif(btrim(p_search), '') is null
      or concat_ws(
        ' ',
        coalesce(j.title, ''),
        coalesce(j.description, ''),
        coalesce(j.location, ''),
        coalesce(j.requested_by, ''),
        coalesce(j.action_type, ''),
        coalesce(j.sector_type, ''),
        coalesce(j.sector_custom, '')
      ) ilike '%' || btrim(p_search) || '%'
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.bulk_delete_jobs(date, date, text, text, text) from public, anon;
grant execute on function public.bulk_delete_jobs(date, date, text, text, text) to authenticated;

create or replace function public.list_jobs_for_export(
  p_date date default null::date,
  p_location text default null::text,
  p_status text default null::text,
  p_search text default null::text
)
returns jsonb
language sql
stable
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
  with filtered_jobs as (
    select
      j.*,
      case when g.id is null then null else jsonb_build_object('name', g.name) end as group_json,
      case when w.id is null then null else jsonb_build_object('id', w.id, 'display_name', w.display_name, 'alias', w.alias) end as worker_json
    from public.jobs j
    left join public.groups g on g.id = j.group_id
    left join public.workers w on w.id = j.worker_id
    where
      (
        p_date is null
        or j.date = p_date
      )
      and (
        nullif(btrim(p_location), '') is null
        or lower(btrim(j.location)) = lower(btrim(p_location))
      )
      and (
        nullif(btrim(p_status), '') is null
        or j.status = btrim(p_status)
      )
      and (
        nullif(btrim(p_search), '') is null
        or concat_ws(
          ' ',
          coalesce(j.title, ''),
          coalesce(j.description, ''),
          coalesce(j.location, ''),
          coalesce(j.requested_by, ''),
          coalesce(j.action_type, ''),
          coalesce(j.sector_type, ''),
          coalesce(j.sector_custom, '')
        ) ilike '%' || btrim(p_search) || '%'
      )
    order by
      j.date desc,
      j.created_at desc,
      j.id desc
  )
  select jsonb_build_object(
    'items',
    coalesce(
      jsonb_agg(
        (to_jsonb(f) - 'group_json' - 'worker_json')
          || jsonb_build_object('groups', f.group_json, 'workers', f.worker_json)
        order by f.date desc, f.created_at desc, f.id desc
      ),
      '[]'::jsonb
    ),
    'total_count',
    count(*)
  )
  from filtered_jobs f;
$function$;

revoke all on function public.list_jobs_for_export(date, text, text, text) from public, anon;
grant execute on function public.list_jobs_for_export(date, text, text, text) to authenticated, service_role;

create or replace function public.list_jobs_paginated(
  p_date date default null::date,
  p_location text default null::text,
  p_status text default null::text,
  p_search text default null::text,
  p_page integer default 1,
  p_page_size integer default 10
)
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_page integer;
  v_page_size integer;
  v_offset bigint;
  v_total_count bigint;
  v_total_pages integer;
  v_items jsonb;
begin
  v_page := least(greatest(coalesce(p_page, 1), 1), 1000000);

  v_page_size := case
    when p_page_size in (10, 30, 50) then p_page_size
    else 10
  end;

  select count(*)
  into v_total_count
  from public.jobs j
  where
    (
      p_date is null
      or j.date = p_date
    )
    and (
      nullif(btrim(p_location), '') is null
      or lower(btrim(j.location)) = lower(btrim(p_location))
    )
    and (
      nullif(btrim(p_status), '') is null
      or j.status = btrim(p_status)
    )
    and (
      nullif(btrim(p_search), '') is null
      or concat_ws(
        ' ',
        coalesce(j.title, ''),
        coalesce(j.description, ''),
        coalesce(j.location, ''),
        coalesce(j.requested_by, ''),
        coalesce(j.action_type, ''),
        coalesce(j.sector_type, ''),
        coalesce(j.sector_custom, '')
      ) ilike '%' || btrim(p_search) || '%'
    );

  v_total_pages := case
    when v_total_count = 0 then 0
    else ceil(v_total_count::numeric / v_page_size)::integer
  end;

  if v_total_pages > 0 then
    v_page := least(v_page, v_total_pages);
  else
    v_page := 1;
  end if;

  v_offset := (v_page::bigint - 1) * v_page_size;

  select coalesce(
    jsonb_agg(
      (to_jsonb(paged_job) - 'group_json' - 'worker_json')
        || jsonb_build_object('groups', paged_job.group_json, 'workers', paged_job.worker_json)
      order by
        paged_job.date desc,
        paged_job.created_at desc,
        paged_job.id desc
    ),
    '[]'::jsonb
  )
  into v_items
  from (
    select
      j.*,
      case when g.id is null then null else jsonb_build_object('name', g.name) end as group_json,
      case when w.id is null then null else jsonb_build_object('id', w.id, 'display_name', w.display_name, 'alias', w.alias) end as worker_json
    from public.jobs j
    left join public.groups g on g.id = j.group_id
    left join public.workers w on w.id = j.worker_id
    where
      (
        p_date is null
        or j.date = p_date
      )
      and (
        nullif(btrim(p_location), '') is null
        or lower(btrim(j.location)) = lower(btrim(p_location))
      )
      and (
        nullif(btrim(p_status), '') is null
        or j.status = btrim(p_status)
      )
      and (
        nullif(btrim(p_search), '') is null
        or concat_ws(
          ' ',
          coalesce(j.title, ''),
          coalesce(j.description, ''),
          coalesce(j.location, ''),
          coalesce(j.requested_by, ''),
          coalesce(j.action_type, ''),
          coalesce(j.sector_type, ''),
          coalesce(j.sector_custom, '')
        ) ilike '%' || btrim(p_search) || '%'
      )
    order by
      j.date desc,
      j.created_at desc,
      j.id desc
    limit v_page_size
    offset v_offset
  ) as paged_job;

  return jsonb_build_object(
    'items', v_items,
    'total_count', v_total_count,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', v_total_pages,
    'has_previous_page', v_page > 1,
    'has_next_page', v_page < v_total_pages
  );
end;
$function$;
revoke all on function public.list_jobs_paginated(date, text, text, text, integer, integer) from public, anon;
grant execute on function public.list_jobs_paginated(date, text, text, text, integer, integer) to authenticated, service_role;
