alter table public.jobs
  add column if not exists title text;

comment on column public.jobs.title is 'Título opcional breve para identificar la solicitud o trabajo.';
