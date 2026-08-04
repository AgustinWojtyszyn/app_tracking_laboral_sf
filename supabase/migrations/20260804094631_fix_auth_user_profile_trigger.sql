-- Keep auth user creation from failing when public.users has evolved.
-- Supabase returns "Database error saving new user" when this trigger raises.

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade
);

alter table if exists public.users
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists role text not null default 'user',
  add column if not exists permissions text[] not null default '{}',
  add column if not exists deleted_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.users
set role = 'user'
where role is null;

do $$
declare
  permissions_type text;
begin
  select format_type(a.atttypid, a.atttypmod)
  into permissions_type
  from pg_attribute a
  where a.attrelid = 'public.users'::regclass
    and a.attname = 'permissions'
    and not a.attisdropped;

  if permissions_type = 'text[]' then
    execute 'alter table public.users alter column permissions set default ''{}''::text[]';
    execute 'update public.users set permissions = ''{}''::text[] where permissions is null';
    execute 'alter table public.users alter column permissions set not null';
  elsif permissions_type = 'jsonb' then
    execute 'alter table public.users alter column permissions set default ''[]''::jsonb';
    execute 'update public.users set permissions = ''[]''::jsonb where permissions is null';
    execute 'alter table public.users alter column permissions set not null';
  end if;
end;
$$;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.users drop constraint if exists %I', constraint_row.conname);
  end loop;
end;
$$;

alter table public.users
  add constraint users_role_check
  check (role in ('admin', 'user', 'solicitante', 'trabajador', 'chofer'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.users.full_name, excluded.full_name),
    role = coalesce(public.users.role, 'user'),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.users enable row level security;

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
  on public.users
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant select, insert, update on public.users to authenticated;

notify pgrst, 'reload schema';
