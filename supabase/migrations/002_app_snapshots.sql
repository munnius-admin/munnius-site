-- Snapshot compacto do MVP manual.
-- Mantém o estado da social seller sincronizado entre Chrome e iPhone enquanto
-- as entidades normalizadas são adotadas gradualmente pela futura extensão.

create table public.app_snapshots (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

alter table public.app_snapshots enable row level security;

create policy "users manage own snapshot"
  on public.app_snapshots
  for all
  using (
    public.is_active_member(organization_id)
    and profile_id = (select auth.uid())
  )
  with check (
    public.is_active_member(organization_id)
    and profile_id = (select auth.uid())
  );

revoke update, delete on public.app_snapshots from anon;
