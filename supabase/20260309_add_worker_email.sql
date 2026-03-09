alter table public.workers
  add column if not exists email text;

create index if not exists workers_email_idx
  on public.workers (lower(email));

-- Set email for worker Franco Luna
update public.workers
set email = 'francoluna.arg@gmail.com',
    updated_at = now()
where id = '6bad0803-208e-4ba9-bf23-902886d423d8';
