-- Harden job-request-images storage permissions.
--
-- The frontend currently stores objects as:
--   {auth.uid()}/{jobIdentifier}/{token-file}
--
-- The bucket remains public for reads to avoid a larger signed-URL frontend
-- migration in this batch. Public read access is therefore an explicit current
-- compatibility decision. Backlog: migrate job images to private signed URLs.

update storage.buckets
set public = true
where id = 'job-request-images';

drop policy if exists "Authenticated users can upload job request images" on storage.objects;
drop policy if exists "Authenticated users can update job request images" on storage.objects;
drop policy if exists "Authenticated users can delete job request images" on storage.objects;

drop policy if exists "Job request images insert own path" on storage.objects;
create policy "Job request images insert own path"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'job-request-images'
  and name like auth.uid()::text || '/%'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Job request images update own path" on storage.objects;
create policy "Job request images update own path"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'job-request-images'
  and name like auth.uid()::text || '/%'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'job-request-images'
  and name like auth.uid()::text || '/%'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Job request images delete own path" on storage.objects;
create policy "Job request images delete own path"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'job-request-images'
  and name like auth.uid()::text || '/%'
  and split_part(name, '/', 1) = auth.uid()::text
);
