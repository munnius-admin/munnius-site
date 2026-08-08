create or replace function public.admin_set_access_role(
  target_organization_id uuid,
  access_email text,
  access_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text := lower(trim(access_email));
  target_profile_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  if not exists (
    select 1
    from public.organizations organization
    where organization.id = target_organization_id
  ) then
    raise exception 'Organização não encontrada.';
  end if;

  update public.access_invites
  set role = access_role,
      updated_at = now()
  where organization_id = target_organization_id
    and lower(email) = clean_email;

  select profile.id
  into target_profile_id
  from public.profiles profile
  where lower(profile.email) = clean_email
  limit 1;

  if target_profile_id is not null then
    update public.organization_members
    set role = access_role
    where organization_id = target_organization_id
      and profile_id = target_profile_id;
  end if;

  if not found and not exists (
    select 1
    from public.access_invites invite
    where invite.organization_id = target_organization_id
      and lower(invite.email) = clean_email
  ) then
    raise exception 'Acesso não encontrado nesta organização.';
  end if;
end;
$$;

revoke all on function public.admin_set_access_role(uuid, text, public.app_role) from public;
grant execute on function public.admin_set_access_role(uuid, text, public.app_role) to authenticated;
