drop policy if exists "automation_runs_insert_member" on public.automation_runs;

create policy "automation_runs_insert_member"
  on public.automation_runs
  for insert
  to authenticated
  with check (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
  );

create policy "automation_runs_update_creator"
  on public.automation_runs
  for update
  to authenticated
  using (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
  )
  with check (
    public.is_org_member(organization_id)
    and created_by = (select auth.uid())
  );
