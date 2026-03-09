alter table public.jobs
  add column if not exists client_request_id uuid;

create unique index if not exists jobs_client_request_id_idx
  on public.jobs (client_request_id);
