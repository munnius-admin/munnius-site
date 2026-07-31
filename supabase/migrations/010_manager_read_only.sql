-- Cargo Gestor: leitura completa da organização sem permissão de alterar a operação.
-- A interface esconde ações de escrita, e estas políticas garantem o mesmo bloqueio no banco.

alter type public.app_role add value if not exists 'manager';

create or replace function public.can_write_organization(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_org
      and membership.profile_id = (select auth.uid())
      and membership.active = true
      and membership.role::text in ('admin', 'social_seller')
  );
$$;

revoke all on function public.can_write_organization(uuid) from public;
grant execute on function public.can_write_organization(uuid) to authenticated;

drop policy if exists "members manage organization snapshot" on public.organization_snapshots;
drop policy if exists "members read organization snapshot" on public.organization_snapshots;
drop policy if exists "editors manage organization snapshot" on public.organization_snapshots;
create policy "members read organization snapshot"
on public.organization_snapshots for select
using (public.is_active_member(organization_id));
create policy "editors manage organization snapshot"
on public.organization_snapshots for all
using (public.can_write_organization(organization_id))
with check (public.can_write_organization(organization_id));

drop policy if exists "users manage own snapshot" on public.app_snapshots;
drop policy if exists "users read own snapshot" on public.app_snapshots;
drop policy if exists "editors manage own snapshot" on public.app_snapshots;
create policy "users read own snapshot"
on public.app_snapshots for select
using (public.is_active_member(organization_id) and profile_id = (select auth.uid()));
create policy "editors manage own snapshot"
on public.app_snapshots for all
using (public.can_write_organization(organization_id) and profile_id = (select auth.uid()))
with check (public.can_write_organization(organization_id) and profile_id = (select auth.uid()));

drop policy if exists "members manage clinics" on public.clinics;
drop policy if exists "members read clinics" on public.clinics;
drop policy if exists "editors manage clinics" on public.clinics;
create policy "members read clinics" on public.clinics for select using (public.is_active_member(organization_id));
create policy "editors manage clinics" on public.clinics for all using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

drop policy if exists "members manage sessions" on public.work_sessions;
drop policy if exists "members read sessions" on public.work_sessions;
drop policy if exists "editors manage sessions" on public.work_sessions;
create policy "members read sessions" on public.work_sessions for select using (public.is_active_member(organization_id));
create policy "editors manage sessions" on public.work_sessions for all using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

drop policy if exists "members manage leads" on public.leads;
drop policy if exists "members read leads" on public.leads;
drop policy if exists "editors manage leads" on public.leads;
create policy "members read leads" on public.leads for select using (public.is_active_member(organization_id));
create policy "editors manage leads" on public.leads for all using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

drop policy if exists "members manage timeline" on public.lead_timeline;
drop policy if exists "members read timeline" on public.lead_timeline;
drop policy if exists "editors manage timeline" on public.lead_timeline;
create policy "members read timeline" on public.lead_timeline for select using (public.is_active_member(organization_id));
create policy "editors manage timeline" on public.lead_timeline for all using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

drop policy if exists "members manage followups" on public.follow_ups;
drop policy if exists "members read followups" on public.follow_ups;
drop policy if exists "editors manage followups" on public.follow_ups;
create policy "members read followups" on public.follow_ups for select using (public.is_active_member(organization_id));
create policy "editors manage followups" on public.follow_ups for all using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

drop policy if exists "members manage templates" on public.message_templates;
drop policy if exists "members read templates" on public.message_templates;
drop policy if exists "editors manage templates" on public.message_templates;
create policy "members read templates" on public.message_templates for select using (public.is_active_member(organization_id));
create policy "editors manage templates" on public.message_templates for all using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

drop policy if exists "members manage deliveries" on public.hunter_deliveries;
drop policy if exists "members read deliveries" on public.hunter_deliveries;
drop policy if exists "editors manage deliveries" on public.hunter_deliveries;
create policy "members read deliveries" on public.hunter_deliveries for select using (public.is_active_member(organization_id));
create policy "editors manage deliveries" on public.hunter_deliveries for all using (public.can_write_organization(organization_id)) with check (public.can_write_organization(organization_id));

drop policy if exists "members append audit" on public.audit_events;
drop policy if exists "editors append audit" on public.audit_events;
create policy "editors append audit"
on public.audit_events for insert
with check (public.can_write_organization(organization_id) and actor_user_id = (select auth.uid()));

drop policy if exists "users append own extension events" on public.extension_events;
drop policy if exists "editors append own extension events" on public.extension_events;
create policy "editors append own extension events"
on public.extension_events for insert
with check (public.can_write_organization(organization_id) and actor_user_id = (select auth.uid()));

drop policy if exists "members process extension events" on public.extension_events;
drop policy if exists "editors process extension events" on public.extension_events;
create policy "editors process extension events"
on public.extension_events for update
using (public.can_write_organization(organization_id))
with check (public.can_write_organization(organization_id));

drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "editors update own profile" on public.profiles;
create policy "editors update own profile"
on public.profiles for update
using (
  id = (select auth.uid())
  and exists (
    select 1 from public.organization_members membership
    where membership.profile_id = (select auth.uid())
      and membership.active = true
      and membership.role::text in ('admin', 'social_seller')
  )
)
with check (id = (select auth.uid()));

drop policy if exists "members upload clinic images" on storage.objects;
drop policy if exists "editors upload organization images" on storage.objects;
create policy "editors upload organization images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'clinic-images'
  and public.can_write_organization(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "members update clinic images" on storage.objects;
drop policy if exists "editors update organization images" on storage.objects;
create policy "editors update organization images"
on storage.objects for update to authenticated
using (
  bucket_id = 'clinic-images'
  and public.can_write_organization(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'clinic-images'
  and public.can_write_organization(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "members delete clinic images" on storage.objects;
drop policy if exists "editors delete organization images" on storage.objects;
create policy "editors delete organization images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'clinic-images'
  and public.can_write_organization(((storage.foldername(name))[1])::uuid)
);
