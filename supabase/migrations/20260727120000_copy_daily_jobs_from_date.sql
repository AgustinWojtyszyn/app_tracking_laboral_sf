alter table public.jobs
  add column if not exists client_request_id text;

create unique index if not exists jobs_client_request_id_unique
  on public.jobs (client_request_id);

create or replace function public.copy_daily_jobs_from_date(
  p_job_ids uuid[],
  p_target_date date,
  p_copy_request_id text
)
returns jsonb
language plpgsql
security invoker
set search_path to 'pg_catalog', 'public'
as $function$
declare
  source_job public.jobs%rowtype;
  requested_count integer;
  selected_count integer := 0;
  copied_count integer := 0;
  failed_count integer := 0;
  source_date date;
  source_date_count integer;
  existing_copy_id uuid;
  inserted_copy_id uuid;
  copy_client_request_id text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_target_date is null then
    raise exception 'Missing target date' using errcode = '22007';
  end if;

  if p_job_ids is null or array_length(p_job_ids, 1) is null then
    raise exception 'Select at least one job' using errcode = '22023';
  end if;

  if nullif(btrim(p_copy_request_id), '') is null then
    raise exception 'Missing copy request id' using errcode = '22023';
  end if;

  select count(*)
  into requested_count
  from unnest(p_job_ids) as selected_id
  where selected_id is not null;

  if requested_count = 0 then
    raise exception 'Select at least one job' using errcode = '22023';
  end if;

  select count(*), min(j.date), count(distinct j.date)
  into selected_count, source_date, source_date_count
  from public.jobs j
  where j.id = any(p_job_ids);

  if selected_count = 0 then
    return jsonb_build_object(
      'copied_count', 0,
      'failed_count', requested_count,
      'target_date', p_target_date
    );
  end if;

  if source_date_count <> 1 then
    raise exception 'All source jobs must belong to the same date' using errcode = '22023';
  end if;

  if source_date >= p_target_date then
    raise exception 'Source date must be before target date' using errcode = '22007';
  end if;

  failed_count := requested_count - selected_count;

  for source_job in
    select j.*
    from public.jobs j
    where j.id = any(p_job_ids)
    order by j.created_at asc, j.id asc
  loop
    begin
      copy_client_request_id := 'copy:' || btrim(p_copy_request_id) || ':' || source_job.id::text;

      select id
      into existing_copy_id
      from public.jobs
      where client_request_id = copy_client_request_id
      limit 1;

      if existing_copy_id is not null then
        copied_count := copied_count + 1;
        existing_copy_id := null;
        continue;
      end if;

      insert into public.jobs (
        user_id,
        group_id,
        worker_id,
        date,
        title,
        location,
        requested_by,
        description,
        status,
        editable_by_group,
        action_type,
        sector_type,
        sector_custom,
        cost_spent,
        amount_to_charge,
        client_request_id
      )
      values (
        auth.uid(),
        source_job.group_id,
        source_job.worker_id,
        p_target_date,
        source_job.title,
        source_job.location,
        source_job.requested_by,
        source_job.description,
        'pending',
        source_job.editable_by_group,
        source_job.action_type,
        source_job.sector_type,
        source_job.sector_custom,
        source_job.cost_spent,
        source_job.amount_to_charge,
        copy_client_request_id
      )
      on conflict (client_request_id) do nothing
      returning id into inserted_copy_id;

      if inserted_copy_id is null then
        copied_count := copied_count + 1;
      else
        copied_count := copied_count + 1;
      end if;
      inserted_copy_id := null;
    exception
      when others then
        failed_count := failed_count + 1;
    end;
  end loop;

  return jsonb_build_object(
    'copied_count', copied_count,
    'failed_count', failed_count,
    'target_date', p_target_date
  );
end;
$function$;

revoke all on function public.copy_daily_jobs_from_date(uuid[], date, text) from public, anon;
grant execute on function public.copy_daily_jobs_from_date(uuid[], date, text) to authenticated;
