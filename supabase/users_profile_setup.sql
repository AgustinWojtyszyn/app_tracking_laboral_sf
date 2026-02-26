-- Perfil de usuario en public.users con RLS y trigger desde auth.users

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users enable row level security;

drop policy if exists "Users can view their own profile" on public.users;
create policy "Users can view their own profile"
  on public.users
  for select
  using (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Si usas el trigger, no necesitas policy de INSERT desde el cliente.
-- (Opcional) Para permitir insert desde el cliente:
-- drop policy if exists "Users can insert their own profile" on public.users;
-- create policy "Users can insert their own profile"
--   on public.users
--   for insert
--   with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
