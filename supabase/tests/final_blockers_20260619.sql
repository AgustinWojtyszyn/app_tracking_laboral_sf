-- Reproducible checks for the 20260619 final blocker fixes.
-- Run only against a temporary/local Supabase database after applying:
--   20260619_01_harden_job_request_images_storage.sql
--   20260619_02_workers_rls_and_safe_assignment.sql
--   20260619_03_jobs_status_and_safe_update_validation.sql

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000019a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'final-admin@example.test', 'x', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000019b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'final-member-a@example.test', 'x', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000019c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'final-member-b@example.test', 'x', now(), now(), now())
on conflict (id) do nothing;

insert into public.users (id, email, full_name, role)
values
  ('00000000-0000-0000-0000-0000000019a1', 'final-admin@example.test', 'Final Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000019b1', 'final-member-a@example.test', 'Final Member A', 'user'),
  ('00000000-0000-0000-0000-0000000019c1', 'final-member-b@example.test', 'Final Member B', 'user')
on conflict (id) do update set role = excluded.role, deleted_at = null;

insert into public.groups (id, name, created_by)
values
  ('19000000-0000-0000-0000-000000000001', 'Final group A', '00000000-0000-0000-0000-0000000019a1'),
  ('19000000-0000-0000-0000-000000000002', 'Final group B', '00000000-0000-0000-0000-0000000019a1')
on conflict (id) do update set name = excluded.name, created_by = excluded.created_by;

insert into public.group_members (group_id, user_id)
values
  ('19000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000019b1'),
  ('19000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000019c1')
on conflict do nothing;

insert into public.workers (id, display_name, is_active, group_id, created_by)
values
  ('29000000-0000-0000-0000-000000000001', 'Final Worker A', true, '19000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000019b1'),
  ('29000000-0000-0000-0000-000000000002', 'Final Worker B', true, '19000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000019c1'),
  ('29000000-0000-0000-0000-000000000003', 'Final Legacy Worker', true, null, null)
on conflict (id) do update
set
  display_name = excluded.display_name,
  is_active = excluded.is_active,
  group_id = excluded.group_id,
  created_by = excluded.created_by;

insert into public.jobs (id, user_id, group_id, worker_id, date, status, location, requested_by, description, editable_by_group)
values (
  '39000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000019b1',
  '19000000-0000-0000-0000-000000000001',
  '29000000-0000-0000-0000-000000000001',
  current_date,
  'pending',
  'Final local',
  'Final requester',
  'Final description',
  true
)
on conflict (id) do update
set
  user_id = excluded.user_id,
  group_id = excluded.group_id,
  worker_id = excluded.worker_id,
  status = excluded.status,
  editable_by_group = excluded.editable_by_group;

insert into storage.buckets (id, name, public)
values ('job-request-images', 'job-request-images', true)
on conflict (id) do update set public = excluded.public;

set local role authenticated;

-- Storage: user A can write only under their own first path segment.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000019b1', true);
insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'job-request-images',
  '00000000-0000-0000-0000-0000000019b1/job-a/image-a.png',
  '00000000-0000-0000-0000-0000000019b1',
  '{}'::jsonb
);

do $$
begin
  insert into storage.objects (bucket_id, name, owner, metadata)
  values (
    'job-request-images',
    '00000000-0000-0000-0000-0000000019c1/job-b/forbidden.png',
    '00000000-0000-0000-0000-0000000019b1',
    '{}'::jsonb
  );
  raise exception 'Expected foreign storage insert to fail';
exception
  when insufficient_privilege then null;
  when check_violation then null;
  when with_check_option_violation then null;
end $$;

-- Storage: user B cannot update/delete user A object.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000019c1', true);
do $$
begin
  update storage.objects
  set metadata = '{"blocked": true}'::jsonb
  where bucket_id = 'job-request-images'
    and name = '00000000-0000-0000-0000-0000000019b1/job-a/image-a.png';
  if found then
    raise exception 'Expected foreign storage update to be blocked';
  end if;
end $$;

do $$
begin
  delete from storage.objects
  where bucket_id = 'job-request-images'
    and name = '00000000-0000-0000-0000-0000000019b1/job-a/image-a.png';
  if found then
    raise exception 'Expected foreign storage delete to be blocked';
  end if;
end $$;

-- Workers: member A cannot see/update/delete group B or legacy workers.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000019b1', true);
do $$
declare
  visible_count integer;
begin
  select count(*)
  into visible_count
  from public.workers
  where id in (
    '29000000-0000-0000-0000-000000000002',
    '29000000-0000-0000-0000-000000000003'
  );

  if visible_count <> 0 then
    raise exception 'Expected foreign/legacy workers to be hidden from member A';
  end if;
end $$;

do $$
begin
  update public.workers
  set display_name = 'Forbidden worker update'
  where id = '29000000-0000-0000-0000-000000000002';
  if found then
    raise exception 'Expected foreign worker update to be blocked';
  end if;
end $$;

do $$
begin
  delete from public.workers
  where id = '29000000-0000-0000-0000-000000000002';
  if found then
    raise exception 'Expected foreign worker delete to be blocked';
  end if;
end $$;

-- safe_update_job: invalid status and foreign worker assignment are rejected.
do $$
begin
  perform public.safe_update_job('39000000-0000-0000-0000-000000000001', '{"status":"invalid"}'::jsonb);
  raise exception 'Expected invalid status to fail';
exception
  when invalid_parameter_value then null;
end $$;

do $$
begin
  perform public.safe_update_job('39000000-0000-0000-0000-000000000001', '{"worker_id":"29000000-0000-0000-0000-000000000002"}'::jsonb);
  raise exception 'Expected foreign worker assignment to fail';
exception
  when insufficient_privilege then null;
end $$;

select (public.safe_update_job('39000000-0000-0000-0000-000000000001', '{"status":"archived"}'::jsonb)).id;
select (public.safe_update_job('39000000-0000-0000-0000-000000000001', '{"worker_id":"29000000-0000-0000-0000-000000000001"}'::jsonb)).id;

-- Admin can operate across workers where policy allows it.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000019a1', true);
select (public.safe_update_job('39000000-0000-0000-0000-000000000001', '{"worker_id":"29000000-0000-0000-0000-000000000002"}'::jsonb)).id;

rollback;
