-- Munnius Social: fundação multi-tenant e auditoria enxuta.
-- Execute no SQL Editor de um projeto Supabase novo.

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'social_seller');
create type public.lead_status as enum ('new', 'talking', 'no_response', 'follow_up', 'sent_to_hunter', 'finished');
create type public.follow_up_status as enum ('pending', 'completed', 'cancelled');
create type public.event_source as enum ('manual_mobile', 'manual_web', 'chrome_extension', 'system');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null default 'social_seller',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  name text not null,
  doctor_name text not null,
  instagram_handle text not null,
  instagram_url text,
  instagram_photo_url text,
  instagram_followers integer,
  hunter_name text not null,
  hunter_phone text not null,
  protocol text,
  location text,
  evaluation_price numeric(10,2),
  daily_lead_target integer not null default 0 check (daily_lead_target >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, instagram_handle)
);

create table public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  clinic_id uuid not null references public.clinics(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer generated always as (
    case when ended_at is null then null else greatest(0, extract(epoch from ended_at - started_at)::integer) end
  ) stored,
  profiles_count integer not null default 0 check (profiles_count >= 0),
  likes_count integer not null default 0 check (likes_count >= 0),
  comments_count integer not null default 0 check (comments_count >= 0),
  directs_count integer not null default 0 check (directs_count >= 0),
  responses_count integer not null default 0 check (responses_count >= 0),
  phones_count integer not null default 0 check (phones_count >= 0),
  source public.event_source not null default 'manual_web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id),
  created_by uuid not null references public.profiles(id),
  name text,
  instagram_handle text not null,
  instagram_url text,
  instagram_photo_url text,
  whatsapp text,
  prospected_at timestamptz not null default now(),
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  status public.lead_status not null default 'new',
  finalization_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, clinic_id, instagram_handle)
);

create table public.lead_timeline (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id),
  event_type text not null,
  label text not null check (char_length(label) <= 140),
  event_at timestamptz not null default now()
);

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id),
  lead_id uuid not null references public.leads(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id),
  scheduled_for timestamptz not null,
  completed_at timestamptz,
  follow_up_order smallint not null default 1 check (follow_up_order between 1 and 9),
  status public.follow_up_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  category text not null,
  message text not null check (char_length(message) <= 1200),
  sort_order smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hunter_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id),
  clinic_id uuid not null references public.clinics(id),
  sent_by uuid not null references public.profiles(id),
  hunter_name text not null,
  hunter_phone text not null,
  sent_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id),
  clinic_id uuid references public.clinics(id),
  lead_id uuid references public.leads(id),
  session_id uuid references public.work_sessions(id),
  event_type text not null,
  summary text not null check (char_length(summary) <= 180),
  source public.event_source not null default 'manual_web',
  metadata_minimal jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index sessions_org_date_idx on public.work_sessions (organization_id, started_at desc);
create index leads_org_status_idx on public.leads (organization_id, status, prospected_at desc);
create index followups_org_due_idx on public.follow_ups (organization_id, status, scheduled_for);
create index timeline_lead_date_idx on public.lead_timeline (lead_id, event_at desc);
create index audit_org_date_idx on public.audit_events (organization_id, created_at desc);

create or replace function public.is_active_member(target_org uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    join public.profiles p on p.id = m.profile_id
    where m.organization_id = target_org
      and m.profile_id = (select auth.uid())
      and m.active and p.active
  );
$$;

create or replace function public.is_admin(target_org uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org
      and profile_id = (select auth.uid())
      and active and role = 'admin'
  );
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.clinics enable row level security;
alter table public.work_sessions enable row level security;
alter table public.leads enable row level security;
alter table public.lead_timeline enable row level security;
alter table public.follow_ups enable row level security;
alter table public.message_templates enable row level security;
alter table public.hunter_deliveries enable row level security;
alter table public.audit_events enable row level security;

create policy "members read organization" on public.organizations for select using (public.is_active_member(id));
create policy "users read own profile" on public.profiles for select using (id = (select auth.uid()));
create policy "users update own profile" on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "members read membership" on public.organization_members for select using (public.is_active_member(organization_id));

-- Admin cuida somente da gestão de usuários/membros.
create policy "admins manage memberships" on public.organization_members for all
  using (public.is_admin(organization_id)) with check (public.is_admin(organization_id));

-- Social sellers são donos da operação dentro da própria organização.
create policy "members manage clinics" on public.clinics for all using (public.is_active_member(organization_id)) with check (public.is_active_member(organization_id));
create policy "members manage sessions" on public.work_sessions for all using (public.is_active_member(organization_id)) with check (public.is_active_member(organization_id));
create policy "members manage leads" on public.leads for all using (public.is_active_member(organization_id)) with check (public.is_active_member(organization_id));
create policy "members manage timeline" on public.lead_timeline for all using (public.is_active_member(organization_id)) with check (public.is_active_member(organization_id));
create policy "members manage followups" on public.follow_ups for all using (public.is_active_member(organization_id)) with check (public.is_active_member(organization_id));
create policy "members manage templates" on public.message_templates for all using (public.is_active_member(organization_id)) with check (public.is_active_member(organization_id));
create policy "members manage deliveries" on public.hunter_deliveries for all using (public.is_active_member(organization_id)) with check (public.is_active_member(organization_id));
create policy "members read audit" on public.audit_events for select using (public.is_active_member(organization_id));
create policy "members append audit" on public.audit_events for insert with check (public.is_active_member(organization_id) and actor_user_id = (select auth.uid()));

-- Auditoria é append-only para usuários comuns.
revoke update, delete on public.audit_events from authenticated;

