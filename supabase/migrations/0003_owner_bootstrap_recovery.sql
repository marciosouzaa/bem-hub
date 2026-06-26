create policy "organizations_select_owner_bootstrap"
on public.organizations
for select
using (owner_id = (select auth.uid()));
