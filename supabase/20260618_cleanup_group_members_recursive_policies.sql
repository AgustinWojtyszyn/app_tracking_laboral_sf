-- Cleanup for legacy recursive group_members policies.
-- Run this after 20260618_groups_members_and_safe_job_update.sql if Supabase
-- still shows old policies that query public.group_members from group_members RLS.

alter table public.group_members enable row level security;

drop policy if exists "group_members_delete_owner_manager_or_admin" on public.group_members;
drop policy if exists "group_members_insert_owner_manager_or_admin" on public.group_members;
drop policy if exists "group_members_select_member_or_admin" on public.group_members;
drop policy if exists "group_members_update_owner_manager_or_admin" on public.group_members;
drop policy if exists "members can see own groups" on public.group_members;
drop policy if exists "users insert own membership" on public.group_members;
drop policy if exists "users see own memberships" on public.group_members;

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

select
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'group_members'
order by policyname;
