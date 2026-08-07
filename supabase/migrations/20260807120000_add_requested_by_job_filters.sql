create or replace function public.bulk_delete_jobs(
  p_start_date date,
  p_end_date date,
  p_status text,
  p_location text default null::text,
  p_requested_by text default null::text,
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
      nullif(btrim(p_requested_by), '') is null
      or j.requested_by ilike '%' || btrim(p_requested_by) || '%'
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

revoke all on function public.bulk_delete_jobs(date, date, text, text, text, text) from public, anon;
grant execute on function public.bulk_delete_jobs(date, date, text, text, text, text) to authenticated;

create or replace function public.list_jobs_for_export(
  p_date date default null::date,
  p_location text default null::text,
  p_status text default null::text,
  p_requested_by text default null::text,
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
        nullif(btrim(p_requested_by), '') is null
        or j.requested_by ilike '%' || btrim(p_requested_by) || '%'
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

revoke all on function public.list_jobs_for_export(date, text, text, text, text) from public, anon;
grant execute on function public.list_jobs_for_export(date, text, text, text, text) to authenticated, service_role;

create or replace function public.list_jobs_paginated(
  p_date date default null::date,
  p_location text default null::text,
  p_status text default null::text,
  p_requested_by text default null::text,
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
      nullif(btrim(p_requested_by), '') is null
      or j.requested_by ilike '%' || btrim(p_requested_by) || '%'
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
        nullif(btrim(p_requested_by), '') is null
        or j.requested_by ilike '%' || btrim(p_requested_by) || '%'
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

revoke all on function public.list_jobs_paginated(date, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.list_jobs_paginated(date, text, text, text, text, integer, integer) to authenticated, service_role;
