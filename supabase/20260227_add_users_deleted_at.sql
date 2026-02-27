-- Soft delete support for users.
alter table if exists public.users
  add column if not exists deleted_at timestamptz;
