-- Auth owns email uniqueness. Profile rows should not block auth.users inserts.

alter table if exists public.users
  drop constraint if exists users_email_key;

drop index if exists public.users_email_key;

create index if not exists users_email_idx
  on public.users (lower(email));

notify pgrst, 'reload schema';
