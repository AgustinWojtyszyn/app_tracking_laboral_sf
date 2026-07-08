alter table public.workers
  add column if not exists email text;

create index if not exists workers_email_idx
  on public.workers (lower(email));

-- Los emails reales de trabajadores no se guardan en el repositorio público.
-- Cargarlos manualmente en Supabase o mediante un script privado.
