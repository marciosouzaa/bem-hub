create policy "profiles_insert_self" on public.profiles
for insert
with check (id = (select auth.uid()));

create policy "organization_members_insert_owner_bootstrap"
on public.organization_members
for insert
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and status = 'active'
  and exists (
    select 1
    from public.organizations o
    where o.id = organization_id
      and o.owner_id = (select auth.uid())
  )
);
