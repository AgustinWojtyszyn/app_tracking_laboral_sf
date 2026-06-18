-- Reproducible checks for group/member RLS and safe job updates.
-- Run only against a temporary/local Supabase database.

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin2@example.test', 'x', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member2@example.test', 'x', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner2@example.test', 'x', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider2@example.test', 'x', now(), now(), now())
on conflict (id) do nothing;

insert into public.users (id, email, full_name, role)
values
  ('00000000-0000-0000-0000-0000000000a1', 'admin2@example.test', 'Admin Two', 'admin'),
  ('00000000-0000-0000-0000-0000000000b1', 'member2@example.test', 'Member Two', 'user'),
  ('00000000-0000-0000-0000-0000000000c1', 'owner2@example.test', 'Owner Two', 'user'),
  ('00000000-0000-0000-0000-0000000000d1', 'outsider2@example.test', 'Outsider Two', 'user')
on conflict (id) do update set role = excluded.role, deleted_at = null;

insert into public.groups (id, name, created_by)
values ('11000000-0000-0000-0000-000000000001', 'Secure group', '00000000-0000-0000-0000-0000000000c1')
on conflict (id) do update set name = excluded.name, created_by = excluded.created_by;

insert into public.group_members (group_id, user_id)
values ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1')
on conflict do nothing;

insert into public.workers (id, display_name, is_active)
values ('22000000-0000-0000-0000-000000000001', 'Worker Two', true)
on conflict (id) do nothing;

insert into public.jobs (id, user_id, group_id, worker_id, date, status, location, requested_by, description, editable_by_group)
values (
  '33000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-0000000000c1',
  '11000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  current_date,
  'pending',
  'Original',
  'Owner',
  'Original description',
  true
)
on conflict (id) do update
set
  user_id = excluded.user_id,
  group_id = excluded.group_id,
  worker_id = excluded.worker_id,
  editable_by_group = excluded.editable_by_group;

set local role authenticated;

-- 1. Creador edita su grupo.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select (public.update_group_secure('11000000-0000-0000-0000-000000000001', 'Secure group updated', null)).id;

-- 2. Miembro comun no edita el grupo.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
do $$
begin
  perform public.update_group_secure('11000000-0000-0000-0000-000000000001', 'Forbidden update', null);
  raise exception 'Expected common member group update to fail';
exception
  when insufficient_privilege then null;
end $$;

-- 3. Miembro comun no agrega ni elimina miembros, tampoco por tabla directa.
do $$
begin
  perform public.add_group_member_secure('11000000-0000-0000-0000-000000000001', 'outsider2@example.test');
  raise exception 'Expected common member add to fail';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  delete from public.group_members
  where group_id = '11000000-0000-0000-0000-000000000001'
    and user_id = '00000000-0000-0000-0000-0000000000d1';
  if found then
    raise exception 'Expected direct group_members delete to be blocked';
  end if;
exception
  when insufficient_privilege then null;
end $$;

-- 4. Creador agrega y elimina miembros.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select * from public.add_group_member_secure('11000000-0000-0000-0000-000000000001', 'outsider2@example.test');
select public.remove_group_member_secure('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1');

-- 5. Usuario ajeno no administra el grupo.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$
begin
  perform public.delete_group_secure('11000000-0000-0000-0000-000000000001');
  raise exception 'Expected outsider group delete to fail';
exception
  when insufficient_privilege then null;
end $$;

-- 6. Administrador realiza acciones permitidas.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select (public.update_group_secure('11000000-0000-0000-0000-000000000001', 'Admin renamed group', null)).id;

-- 7. Llamadas directas a tablas sensibles siguen bloqueadas por RLS.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
do $$
begin
  update public.groups
  set name = 'Direct forbidden update'
  where id = '11000000-0000-0000-0000-000000000001';
  if found then
    raise exception 'Expected direct group update to be blocked';
  end if;
exception
  when insufficient_privilege then null;
end $$;

-- Safe job update checks.
-- Propietario actualiza campo permitido.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select (public.safe_update_job('33000000-0000-0000-0000-000000000001', '{"title":"Owner title"}'::jsonb)).id;

-- Miembro autorizado actualiza campo permitido.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select (public.safe_update_job('33000000-0000-0000-0000-000000000001', '{"description":"Member description"}'::jsonb)).id;

-- Miembro no puede cambiar campos protegidos.
do $$
begin
  perform public.safe_update_job('33000000-0000-0000-0000-000000000001', '{"user_id":"00000000-0000-0000-0000-0000000000b1"}'::jsonb);
  raise exception 'Expected user_id protected update to fail';
exception
  when invalid_parameter_value then null;
end $$;

do $$
begin
  perform public.safe_update_job('33000000-0000-0000-0000-000000000001', '{"group_id":"11000000-0000-0000-0000-000000000001"}'::jsonb);
  raise exception 'Expected group_id protected update to fail';
exception
  when invalid_parameter_value then null;
end $$;

do $$
begin
  perform public.safe_update_job('33000000-0000-0000-0000-000000000001', '{"editable_by_group":false}'::jsonb);
  raise exception 'Expected editable_by_group protected update to fail';
exception
  when invalid_parameter_value then null;
end $$;

-- Usuario ajeno no actualiza el trabajo.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
do $$
begin
  perform public.safe_update_job('33000000-0000-0000-0000-000000000001', '{"title":"Outsider"}'::jsonb);
  raise exception 'Expected outsider job update to fail';
exception
  when insufficient_privilege then null;
end $$;

-- Administrador mantiene permisos.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select (public.safe_update_job('33000000-0000-0000-0000-000000000001', '{"location":"Admin location"}'::jsonb)).id;

-- Update directo a Supabase no evita las restricciones.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
do $$
begin
  update public.jobs
  set user_id = '00000000-0000-0000-0000-0000000000b1'
  where id = '33000000-0000-0000-0000-000000000001';
  if found then
    raise exception 'Expected direct jobs update to be blocked';
  end if;
exception
  when insufficient_privilege then null;
end $$;

rollback;
