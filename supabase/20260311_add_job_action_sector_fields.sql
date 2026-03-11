alter table public.jobs
  add column if not exists action_type text,
  add column if not exists sector_type text,
  add column if not exists sector_custom text;
