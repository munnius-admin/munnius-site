-- Um único estado operacional por organização.
-- Identidade e permissões continuam individuais; clínicas, leads e operação são compartilhados.

create table if not exists public.organization_snapshots (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.organization_snapshots enable row level security;

-- O PostgREST exige grants de tabela além das políticas RLS. Sem eles, o
-- navegador autenticado cai no cache local e dois aparelhos parecem ter bancos
-- diferentes. Mantemos o acesso anônimo fechado e concedemos somente o mínimo
-- necessário aos usuários autenticados; as políticas RLS continuam sendo a
-- barreira que isola cada organização.
revoke all on public.organization_snapshots from anon;
grant select, insert, update on public.organization_snapshots to authenticated;
grant select on public.organizations, public.profiles, public.organization_members to authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update on public.app_snapshots to authenticated;

drop policy if exists "members manage organization snapshot" on public.organization_snapshots;
create policy "members manage organization snapshot"
on public.organization_snapshots
for all
using (public.is_active_member(organization_id))
with check (public.is_active_member(organization_id));

create or replace function public.merge_snapshot_array(existing_items jsonb, incoming_items jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by item->>'id'), '[]'::jsonb)
  from (
    select distinct on (item->>'id') item
    from (
      select value as item, 0 as priority
      from jsonb_array_elements(coalesce(existing_items, '[]'::jsonb))
      union all
      select value as item, 1 as priority
      from jsonb_array_elements(coalesce(incoming_items, '[]'::jsonb))
    ) combined
    where jsonb_typeof(item) = 'object' and item ? 'id'
    order by item->>'id', priority desc
  ) deduplicated;
$$;

create or replace function public.merge_organization_payload(existing_payload jsonb, incoming_payload jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select
    (coalesce(existing_payload, '{}'::jsonb) || coalesce(incoming_payload, '{}'::jsonb))
    || jsonb_build_object(
      'version', 3,
      'clinics', public.merge_snapshot_array(existing_payload->'clinics', incoming_payload->'clinics'),
      'leads', public.merge_snapshot_array(existing_payload->'leads', incoming_payload->'leads'),
      'followups', public.merge_snapshot_array(existing_payload->'followups', incoming_payload->'followups'),
      'sessions', public.merge_snapshot_array(existing_payload->'sessions', incoming_payload->'sessions'),
      'templates', public.merge_snapshot_array(existing_payload->'templates', incoming_payload->'templates')
    );
$$;

do $$
declare
  snapshot_record record;
begin
  for snapshot_record in
    select organization_id, payload, updated_at
    from public.app_snapshots
    order by updated_at
  loop
    insert into public.organization_snapshots (organization_id, payload, updated_at)
    values (snapshot_record.organization_id, snapshot_record.payload, snapshot_record.updated_at)
    on conflict (organization_id) do update
      set payload = public.merge_organization_payload(
        public.organization_snapshots.payload,
        excluded.payload
      ),
      updated_at = greatest(public.organization_snapshots.updated_at, excluded.updated_at);
  end loop;
end
$$;

create or replace function public.save_organization_snapshot(incoming_payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_organization_id uuid;
begin
  select membership.organization_id
  into target_organization_id
  from public.organization_members membership
  where membership.profile_id = (select auth.uid())
    and membership.active = true
  limit 1;

  if target_organization_id is null then
    raise exception 'Usuário sem organização ativa.';
  end if;

  insert into public.organization_snapshots (organization_id, payload, updated_at)
  values (target_organization_id, incoming_payload, now())
  on conflict (organization_id) do update
    set payload = public.merge_organization_payload(
      public.organization_snapshots.payload,
      excluded.payload
    ),
    updated_at = now();
end;
$$;

revoke all on function public.save_organization_snapshot(jsonb) from public;
grant execute on function public.save_organization_snapshot(jsonb) to authenticated;

alter type public.lead_status add value if not exists 'lost' after 'follow_up';

alter table public.leads
  add column if not exists procedure_discussed boolean not null default false,
  add column if not exists value_understood boolean not null default false,
  add column if not exists fit_confirmed boolean not null default false,
  add column if not exists knows_doctor boolean not null default false,
  add column if not exists interested_this_month boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'organization_snapshots'
  ) then
    alter publication supabase_realtime add table public.organization_snapshots;
  end if;
end
$$;
