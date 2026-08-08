-- Administração global de organizações e acessos permitidos.
-- A operação continua isolada por organization_id; o administrador da plataforma
-- gerencia somente organizações, convites e vínculos de usuários.

create table if not exists public.platform_admins (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins administrator
    where administrator.profile_id = (select auth.uid())
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

insert into public.platform_admins (profile_id)
select profile.id
from public.profiles profile
where lower(profile.email) = 'grmunhoz7@gmail.com'
on conflict (profile_id) do nothing;

create table if not exists public.access_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.app_role not null default 'social_seller',
  active boolean not null default true,
  invited_by uuid not null references public.profiles(id),
  claimed_by uuid references public.profiles(id),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, organization_id)
);

insert into public.access_invites (
  email, full_name, organization_id, role, active, invited_by, claimed_by, claimed_at
)
select
  lower(profile.email), profile.full_name, membership.organization_id, membership.role,
  membership.active, administrator.profile_id, membership.profile_id, membership.created_at
from public.organization_members membership
join public.profiles profile on profile.id = membership.profile_id
cross join lateral (
  select platform_admin.profile_id from public.platform_admins platform_admin order by platform_admin.created_at limit 1
) administrator
on conflict (email, organization_id) do nothing;

alter table public.platform_admins enable row level security;
alter table public.access_invites enable row level security;

revoke all on public.platform_admins, public.access_invites from anon;
grant select on public.platform_admins to authenticated;
grant select, insert, update on public.access_invites to authenticated;

create policy "platform admins read own grant"
on public.platform_admins for select
using (profile_id = (select auth.uid()));

create policy "platform admins manage invitations"
on public.access_invites for all
using (public.is_platform_admin())
with check (public.is_platform_admin() and invited_by = (select auth.uid()));

create policy "platform admins read organizations"
on public.organizations for select
using (public.is_platform_admin());

create policy "platform admins read profiles"
on public.profiles for select
using (public.is_platform_admin());

create policy "platform admins read memberships"
on public.organization_members for select
using (public.is_platform_admin());

create policy "platform admins manage memberships"
on public.organization_members for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

create or replace function public.claim_access_invite()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  invited_name text;
  claimed_organization_id uuid;
  invitation record;
begin
  if current_user_id is null then
    raise exception 'Faça login para ativar o acesso.';
  end if;

  select lower(account.email), coalesce(account.raw_user_meta_data->>'full_name', account.raw_user_meta_data->>'name')
  into current_email, invited_name
  from auth.users account
  where account.id = current_user_id;

  select coalesce(invite.full_name, invited_name, split_part(current_email, '@', 1))
  into invited_name
  from public.access_invites invite
  where lower(invite.email) = current_email and invite.active
  order by invite.created_at
  limit 1;

  if invited_name is null then
    raise exception 'Este e-mail ainda não possui acesso permitido.';
  end if;

  insert into public.profiles (id, full_name, email, active)
  values (current_user_id, invited_name, current_email, true)
  on conflict (id) do update
    set full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        email = excluded.email,
        active = true,
        updated_at = now();

  for invitation in
    select invite.*
    from public.access_invites invite
    where lower(invite.email) = current_email and invite.active
    order by invite.created_at
  loop
    insert into public.organization_members (organization_id, profile_id, role, active)
    values (invitation.organization_id, current_user_id, invitation.role, true)
    on conflict (organization_id, profile_id) do update
      set role = excluded.role, active = true;

    update public.access_invites
    set claimed_by = current_user_id, claimed_at = coalesce(claimed_at, now()), updated_at = now()
    where id = invitation.id;

    claimed_organization_id := coalesce(claimed_organization_id, invitation.organization_id);
  end loop;

  return claimed_organization_id;
end;
$$;

revoke all on function public.claim_access_invite() from public;
grant execute on function public.claim_access_invite() to authenticated;

create or replace function public.admin_directory()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  return jsonb_build_object(
    'organizations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', organization.id,
        'name', organization.name,
        'slug', organization.slug,
        'active', organization.active,
        'createdAt', organization.created_at
      ) order by organization.name)
      from public.organizations organization
    ), '[]'::jsonb),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'organizationId', membership.organization_id,
        'profileId', membership.profile_id,
        'role', membership.role,
        'active', membership.active,
        'fullName', profile.full_name,
        'email', profile.email,
        'createdAt', membership.created_at
      ) order by profile.full_name)
      from public.organization_members membership
      join public.profiles profile on profile.id = membership.profile_id
    ), '[]'::jsonb),
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', invite.id,
        'organizationId', invite.organization_id,
        'email', invite.email,
        'fullName', invite.full_name,
        'role', invite.role,
        'active', invite.active,
        'claimed', invite.claimed_by is not null,
        'createdAt', invite.created_at
      ) order by invite.created_at desc)
      from public.access_invites invite
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_directory() from public;
grant execute on function public.admin_directory() to authenticated;

create or replace function public.admin_create_organization(organization_name text, organization_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_id uuid;
  clean_name text := trim(organization_name);
  clean_slug text := lower(trim(organization_slug));
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;
  if char_length(clean_name) < 2 or clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Nome ou identificador da organização inválido.';
  end if;

  insert into public.organizations (name, slug, active)
  values (clean_name, clean_slug, true)
  returning id into created_id;

  return created_id;
end;
$$;

revoke all on function public.admin_create_organization(text, text) from public;
grant execute on function public.admin_create_organization(text, text) to authenticated;

create or replace function public.admin_save_access(
  access_email text,
  access_name text,
  target_organization_id uuid,
  access_role public.app_role default 'social_seller'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_id uuid;
  existing_profile_id uuid;
  clean_email text := lower(trim(access_email));
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;
  if clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'E-mail inválido.';
  end if;
  if not exists (select 1 from public.organizations where id = target_organization_id and active) then
    raise exception 'Organização inválida ou inativa.';
  end if;

  insert into public.access_invites (email, full_name, organization_id, role, active, invited_by)
  values (clean_email, trim(access_name), target_organization_id, access_role, true, (select auth.uid()))
  on conflict (email, organization_id) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        active = true,
        invited_by = excluded.invited_by,
        updated_at = now()
  returning id into invite_id;

  select profile.id into existing_profile_id
  from public.profiles profile
  where lower(profile.email) = clean_email
  limit 1;

  if existing_profile_id is not null then
    insert into public.organization_members (organization_id, profile_id, role, active)
    values (target_organization_id, existing_profile_id, access_role, true)
    on conflict (organization_id, profile_id) do update
      set role = excluded.role, active = true;

    update public.access_invites
    set claimed_by = existing_profile_id, claimed_at = coalesce(claimed_at, now()), updated_at = now()
    where id = invite_id;
  end if;

  return invite_id;
end;
$$;

revoke all on function public.admin_save_access(text, text, uuid, public.app_role) from public;
grant execute on function public.admin_save_access(text, text, uuid, public.app_role) to authenticated;

create or replace function public.admin_set_access_active(invite_id uuid, access_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_invite record;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito ao administrador da plataforma.';
  end if;

  select * into target_invite from public.access_invites where id = invite_id;
  if target_invite.id is null then raise exception 'Acesso não encontrado.'; end if;

  update public.access_invites
  set active = access_active, updated_at = now()
  where id = invite_id;

  if target_invite.claimed_by is not null then
    update public.organization_members
    set active = access_active, role = target_invite.role
    where organization_id = target_invite.organization_id
      and profile_id = target_invite.claimed_by;
  end if;
end;
$$;

revoke all on function public.admin_set_access_active(uuid, boolean) from public;
grant execute on function public.admin_set_access_active(uuid, boolean) to authenticated;
