-- Public assets used by Supabase Auth email templates.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'email-assets',
  'email-assets',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Email assets are publicly readable" on storage.objects;
create policy "Email assets are publicly readable"
  on storage.objects
  for select
  to public
  using (bucket_id = 'email-assets');
