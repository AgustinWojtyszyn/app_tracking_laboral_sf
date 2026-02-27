-- Adds requested_by to jobs to support "quién solicita".
alter table if exists public.jobs
  add column if not exists requested_by text;
