-- Miniaturas públicas das clínicas. O caminho sempre começa pelo organization_id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinic-images',
  'clinic-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members upload clinic images" on storage.objects;
create policy "members upload clinic images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'clinic-images'
  and exists (
    select 1
    from public.organization_members membership
    where membership.profile_id = (select auth.uid())
      and membership.active = true
      and membership.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "members update clinic images" on storage.objects;
create policy "members update clinic images"
on storage.objects for update to authenticated
using (
  bucket_id = 'clinic-images'
  and exists (
    select 1
    from public.organization_members membership
    where membership.profile_id = (select auth.uid())
      and membership.active = true
      and membership.organization_id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'clinic-images'
  and exists (
    select 1
    from public.organization_members membership
    where membership.profile_id = (select auth.uid())
      and membership.active = true
      and membership.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "members delete clinic images" on storage.objects;
create policy "members delete clinic images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'clinic-images'
  and exists (
    select 1
    from public.organization_members membership
    where membership.profile_id = (select auth.uid())
      and membership.active = true
      and membership.organization_id::text = (storage.foldername(name))[1]
  )
);
