-- Impede que um aparelho com cache anterior a um reset restaure dados apagados.
-- Clientes atuais usam o RPC v2; o RPC legado é bloqueado depois que resetAt existe.

create or replace function public.save_organization_snapshot_v2(incoming_payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_organization_id uuid;
  current_payload jsonb;
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

  select snapshot.payload
  into current_payload
  from public.organization_snapshots snapshot
  where snapshot.organization_id = target_organization_id;

  if current_payload ? 'resetAt'
     and coalesce(incoming_payload->>'resetAt', '') <> current_payload->>'resetAt' then
    raise exception 'Cache anterior ao reset. Recarregue o aplicativo.';
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

revoke all on function public.save_organization_snapshot_v2(jsonb) from public;
grant execute on function public.save_organization_snapshot_v2(jsonb) to authenticated;

create or replace function public.save_organization_snapshot(incoming_payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_organization_id uuid;
  current_payload jsonb;
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

  select snapshot.payload
  into current_payload
  from public.organization_snapshots snapshot
  where snapshot.organization_id = target_organization_id;

  if current_payload ? 'resetAt' then
    raise exception 'Versão antiga do aplicativo. Recarregue para continuar.';
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
