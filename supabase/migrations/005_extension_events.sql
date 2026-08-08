-- Eventos enxutos detectados pela extensão Chrome.
-- Não armazena HTML, prints, senhas nem conversas completas.

create table if not exists public.extension_events (
  id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  clinic_id text not null,
  session_id text not null,
  event_type text not null,
  instagram_handle text,
  instagram_url text,
  dedupe_key text not null,
  event_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, dedupe_key)
);

create index if not exists extension_events_org_pending_idx
  on public.extension_events (organization_id, processed_at, event_at);

alter table public.extension_events enable row level security;

drop policy if exists "members read extension events" on public.extension_events;
create policy "members read extension events"
on public.extension_events for select
using (public.is_active_member(organization_id));

drop policy if exists "users append own extension events" on public.extension_events;
create policy "users append own extension events"
on public.extension_events for insert
with check (
  public.is_active_member(organization_id)
  and actor_user_id = (select auth.uid())
);

drop policy if exists "members process extension events" on public.extension_events;
create policy "members process extension events"
on public.extension_events for update
using (public.is_active_member(organization_id))
with check (public.is_active_member(organization_id));

revoke all on public.extension_events from anon;
revoke update on public.extension_events from authenticated;
grant select, insert on public.extension_events to authenticated;
grant update (processed_at) on public.extension_events to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'extension_events'
  ) then
    alter publication supabase_realtime add table public.extension_events;
  end if;
end
$$;
