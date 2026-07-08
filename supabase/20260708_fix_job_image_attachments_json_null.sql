-- Fix: allow JSON null in jobs.image_attachments.
-- Context:
-- safe_update_job receives image_attachments through a JSON payload.
-- When the frontend sends image_attachments: null, PostgreSQL receives JSON null,
-- not SQL NULL. The previous validator accepted SQL NULL but rejected JSON null,
-- causing jobs_image_attachments_valid to fail when updating jobs without images.

create or replace function public.validate_job_image_attachments(payload jsonb)
returns boolean
language plpgsql
immutable
set search_path to 'public', 'auth', 'extensions', 'pg_temp'
as $function$
declare
  attachment jsonb;
  mime_type text;
  raw_file_size text;
  file_size_bytes bigint;
begin
  if payload is null or payload = 'null'::jsonb then
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

    if length(coalesce(attachment ->> 'image_title', '')) > 120 then
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
$function$;
