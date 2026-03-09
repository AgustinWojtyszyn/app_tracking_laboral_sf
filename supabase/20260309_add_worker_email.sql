alter table public.workers
  add column if not exists email text;

create index if not exists workers_email_idx
  on public.workers (lower(email));

-- Set email for worker Franco Luna
update public.workers
set email = 'francoluna.arg@gmail.com',
    updated_at = now()
where id = '6bad0803-208e-4ba9-bf23-902886d423d8';

-- Set email for worker Agustin
update public.workers
set email = 'agustinwojtyszyn99@gmail.com',
    updated_at = now()
where id = '657b7a15-08ae-4e47-8465-d5b8d4863059';
