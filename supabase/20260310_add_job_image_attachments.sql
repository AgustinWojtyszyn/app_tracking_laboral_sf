create or replace function public.validate_job_image_attachments(payload jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  attachment jsonb;
  mime_type text;
  raw_file_size text;
  file_size_bytes bigint;
begin
  if payload is null then
    return true;
  end if;

  if jsonb_typeof(payload) <> 'array' then
    return false;
  end if;

  if jsonb_array_length(payload) > 3 then
    return false;
  end if;

  for attachment in
    select value from jsonb_array_elements(payload)
  loop
    if jsonb_typeof(attachment) <> 'object' then
      return false;
    end if;

    if length(coalesce(attachment ->> 'image_description', '')) > 200 then
      return false;
    end if;

    mime_type := lower(coalesce(attachment ->> 'mime_type', ''));
    if mime_type <> '' and mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
      return false;
    end if;

    raw_file_size := nullif(attachment ->> 'file_size_bytes', '');
    if raw_file_size is not null then
      if raw_file_size !~ '^[0-9]+$' then
        return false;
      end if;

      file_size_bytes := raw_file_size::bigint;
      if file_size_bytes > 5242880 then
        return false;
      end if;
    end if;
  end loop;

  return true;
end;
$$;

alter table public.jobs
  add column if not exists image_attachments jsonb;

alter table public.jobs
  drop constraint if exists jobs_image_attachments_valid;

alter table public.jobs
  add constraint jobs_image_attachments_valid
  check (public.validate_job_image_attachments(image_attachments));

comment on column public.jobs.image_attachments is 'Adjuntos opcionales del trabajo. Cada item puede incluir image_path, image_url, image_description, file_name, mime_type y file_size_bytes.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-request-images',
  'job-request-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload job request images" on storage.objects;
create policy "Authenticated users can upload job request images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'job-request-images');

drop policy if exists "Authenticated users can update job request images" on storage.objects;
create policy "Authenticated users can update job request images"
on storage.objects
for update
to authenticated
using (bucket_id = 'job-request-images')
with check (bucket_id = 'job-request-images');

drop policy if exists "Authenticated users can delete job request images" on storage.objects;
create policy "Authenticated users can delete job request images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'job-request-images');
