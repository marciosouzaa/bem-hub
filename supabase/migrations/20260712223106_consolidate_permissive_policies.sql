drop policy if exists "organizations_select_member" on public.organizations;
drop policy if exists "organizations_select_owner_bootstrap" on public.organizations;
create policy "organizations_select_member_or_owner"
  on public.organizations for select to authenticated
  using (
    public.is_org_member(id)
    or owner_id = (select auth.uid())
  );

drop policy if exists "organization_members_insert_admin" on public.organization_members;
drop policy if exists "organization_members_insert_owner_bootstrap" on public.organization_members;
create policy "organization_members_insert_admin_or_owner_bootstrap"
  on public.organization_members for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    or (
      user_id = (select auth.uid())
      and role = 'owner'
      and status = 'active'
      and exists (
        select 1 from public.organizations o
        where o.id = organization_id
          and o.owner_id = (select auth.uid())
      )
    )
  );

drop policy if exists "subscriptions_select_member" on public.subscriptions;
drop policy if exists "subscriptions_manage_admin" on public.subscriptions;
create policy "subscriptions_select_member" on public.subscriptions
  for select to authenticated using (public.is_org_member(organization_id));
create policy "subscriptions_insert_admin" on public.subscriptions
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "subscriptions_update_admin" on public.subscriptions
  for update to authenticated using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy "subscriptions_delete_admin" on public.subscriptions
  for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "assistants_select_member" on public.assistants;
drop policy if exists "assistants_manage_admin" on public.assistants;
create policy "assistants_select_member" on public.assistants
  for select to authenticated using (public.is_org_member(organization_id));
create policy "assistants_insert_admin" on public.assistants
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "assistants_update_admin" on public.assistants
  for update to authenticated using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy "assistants_delete_admin" on public.assistants
  for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "knowledge_bases_select_member" on public.knowledge_bases;
drop policy if exists "knowledge_bases_manage_admin" on public.knowledge_bases;
create policy "knowledge_bases_select_member" on public.knowledge_bases
  for select to authenticated using (public.is_org_member(organization_id));
create policy "knowledge_bases_insert_admin" on public.knowledge_bases
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "knowledge_bases_update_admin" on public.knowledge_bases
  for update to authenticated using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy "knowledge_bases_delete_admin" on public.knowledge_bases
  for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "documents_select_member" on public.documents;
drop policy if exists "documents_manage_admin" on public.documents;
create policy "documents_select_member" on public.documents
  for select to authenticated using (public.is_org_member(organization_id));
create policy "documents_insert_admin" on public.documents
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "documents_update_admin" on public.documents
  for update to authenticated using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy "documents_delete_admin" on public.documents
  for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "document_chunks_select_member" on public.document_chunks;
drop policy if exists "document_chunks_manage_admin" on public.document_chunks;
create policy "document_chunks_select_member" on public.document_chunks
  for select to authenticated using (public.is_org_member(organization_id));
create policy "document_chunks_insert_admin" on public.document_chunks
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "document_chunks_update_admin" on public.document_chunks
  for update to authenticated using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy "document_chunks_delete_admin" on public.document_chunks
  for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "automations_select_member" on public.automations;
drop policy if exists "automations_manage_admin" on public.automations;
create policy "automations_select_member" on public.automations
  for select to authenticated using (public.is_org_member(organization_id));
create policy "automations_insert_admin" on public.automations
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "automations_update_admin" on public.automations
  for update to authenticated using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy "automations_delete_admin" on public.automations
  for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "integrations_select_admin" on public.integrations;
drop policy if exists "integrations_manage_admin" on public.integrations;
create policy "integrations_select_admin" on public.integrations
  for select to authenticated using (public.is_org_admin(organization_id));
create policy "integrations_insert_admin" on public.integrations
  for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "integrations_update_admin" on public.integrations
  for update to authenticated using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy "integrations_delete_admin" on public.integrations
  for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "ai_provider_connections_select_member"
  on public.ai_provider_connections;
drop policy if exists "ai_provider_connections_manage_admin"
  on public.ai_provider_connections;
create policy "ai_provider_connections_select_member"
  on public.ai_provider_connections for select to authenticated
  using (public.is_org_member(organization_id));
create policy "ai_provider_connections_insert_admin"
  on public.ai_provider_connections for insert to authenticated
  with check (public.is_org_admin(organization_id));
create policy "ai_provider_connections_update_admin"
  on public.ai_provider_connections for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
create policy "ai_provider_connections_delete_admin"
  on public.ai_provider_connections for delete to authenticated
  using (public.is_org_admin(organization_id));
