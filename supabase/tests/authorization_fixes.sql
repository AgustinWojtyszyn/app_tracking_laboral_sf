-- Reproducible authorization checks for 20260618_authorization_fixes.sql.
-- Run only against a temporary/local Supabase database.

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.test', 'x', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@example.test', 'x', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.test', 'x', now(), now(), now())
on conflict (id) do nothing;

insert into public.users (id, email, full_name, role)
values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.test', 'Admin', 'admin'),
  ('00000000-0000-0000-0000-0000000000b1', 'member@example.test', 'Member', 'user'),
  ('00000000-0000-0000-0000-0000000000c1', 'owner@example.test', 'Owner', 'user')
on conflict (id) do update set role = excluded.role, deleted_at = null;

insert into public.groups (id, name, created_by)
values
  ('10000000-0000-0000-0000-000000000001', 'Allowed group', '00000000-0000-0000-0000-0000000000c1'),
  ('10000000-0000-0000-0000-000000000002', 'Foreign group', '00000000-0000-0000-0000-0000000000a1')
on conflict (id) do nothing;

insert into public.group_members (group_id, user_id)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1')
on conflict do nothing;

insert into public.workers (id, display_name, is_active)
values ('20000000-0000-0000-0000-000000000001', 'Worker', true)
on conflict (id) do nothing;

insert into public.group_join_requests (id, group_id, user_id, status)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000a1',
  'pending'
)
on conflict (id) do update set status = 'pending';

set local role authenticated;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- 1. Miembro crea trabajo en su grupo.
insert into public.jobs (id, user_id, group_id, worker_id, date, status, location, requested_by, description)
values (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000b1',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  current_date,
  'pending',
  'Local',
  'Requester',
  'Allowed insert'
);

-- 2. Miembro no crea trabajo en grupo ajeno.
do $$
begin
  insert into public.jobs (id, user_id, group_id, worker_id, date, status, location, requested_by, description)
  values (
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-0000000000b1',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    current_date,
    'pending',
    'Local',
    'Requester',
    'Forbidden insert'
  );
  raise exception 'Expected foreign group insert to fail';
exception
  when insufficient_privilege then null;
  when check_violation then null;
end $$;

-- 3. Usuario comun no ejecuta borrados masivos.
do $$
begin
  perform public.bulk_delete_jobs(current_date, current_date, 'pending');
  raise exception 'Expected bulk delete to fail for common user';
exception
  when insufficient_privilege then null;
end $$;

-- 5. Miembro comun no ve solicitudes.
do $$
begin
  perform public.list_group_join_requests('10000000-0000-0000-0000-000000000001');
  raise exception 'Expected common member list requests to fail';
exception
  when insufficient_privilege then null;
end $$;

-- 6. Creador del grupo si procesa solicitudes.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select public.respond_to_group_join_request('40000000-0000-0000-0000-000000000001', false);

-- 4. Administrador si ejecuta borrados masivos.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select public.bulk_delete_jobs(current_date, current_date, 'pending');

rollback;
