create unique index if not exists assistants_single_default_per_org_idx
  on public.assistants(organization_id)
  where is_default;
