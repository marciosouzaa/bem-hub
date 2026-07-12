drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "organizations_insert_authenticated" on public.organizations;
create policy "organizations_insert_authenticated"
  on public.organizations
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "conversations_insert_member" on public.conversations;
create policy "conversations_insert_member"
  on public.conversations
  for insert
  to authenticated
  with check (
    public.is_org_member(organization_id)
    and user_id = (select auth.uid())
  );

drop policy if exists "conversations_update_owner_or_admin" on public.conversations;
create policy "conversations_update_owner_or_admin"
  on public.conversations
  for update
  to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      user_id = (select auth.uid())
      or public.is_org_admin(organization_id)
    )
  )
  with check (
    public.is_org_member(organization_id)
    and (
      user_id = (select auth.uid())
      or public.is_org_admin(organization_id)
    )
  );
