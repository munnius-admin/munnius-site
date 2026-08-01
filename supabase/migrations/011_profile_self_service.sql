-- Perfil pessoal pode ser atualizado por qualquer membro ativo, inclusive Gestor.
-- Isso não concede escrita em clínicas, sessões, leads ou outros dados operacionais.

drop policy if exists "editors update own profile" on public.profiles;
drop policy if exists "members update own profile" on public.profiles;
create policy "members update own profile"
on public.profiles for update
using (
  id = (select auth.uid())
  and exists (
    select 1
    from public.organization_members membership
    where membership.profile_id = (select auth.uid())
      and membership.active = true
  )
)
with check (id = (select auth.uid()));

drop policy if exists "editors upload organization images" on storage.objects;
drop policy if exists "members upload organization images" on storage.objects;
create policy "members upload organization images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'clinic-images'
  and (
    public.can_write_organization(((storage.foldername(name))[1])::uuid)
    or (
      (storage.foldername(name))[2] = 'profiles'
      and (storage.foldername(name))[3] like (select auth.uid())::text || '-%'
      and exists (
        select 1
        from public.organization_members membership
        where membership.profile_id = (select auth.uid())
          and membership.active = true
          and membership.organization_id::text = (storage.foldername(name))[1]
      )
    )
  )
);
