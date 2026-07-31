-- Permite que o administrador da plataforma renomeie uma organização.
-- O identificador (slug) permanece estável para não quebrar integrações.

create or replace function public.admin_update_organization(
  target_organization_id uuid,
  organization_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := trim(organization_name);
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  if char_length(clean_name) < 2 then
    raise exception 'Nome da organização inválido.';
  end if;

  update public.organizations
  set name = clean_name
  where id = target_organization_id;

  if not found then
    raise exception 'Organização não encontrada.';
  end if;

  return target_organization_id;
end;
$$;

revoke all on function public.admin_update_organization(uuid, text) from public;
grant execute on function public.admin_update_organization(uuid, text) to authenticated;
