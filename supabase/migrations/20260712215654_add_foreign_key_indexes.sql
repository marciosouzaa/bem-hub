create index if not exists organizations_owner_id_idx
  on public.organizations(owner_id);

create index if not exists subscriptions_plan_id_idx
  on public.subscriptions(plan_id);

create index if not exists assistants_created_by_idx
  on public.assistants(created_by);

create index if not exists conversations_assistant_id_idx
  on public.conversations(assistant_id);

create index if not exists conversations_user_id_idx
  on public.conversations(user_id);

create index if not exists messages_organization_id_idx
  on public.messages(organization_id);

create index if not exists knowledge_bases_organization_id_idx
  on public.knowledge_bases(organization_id);

create index if not exists documents_created_by_idx
  on public.documents(created_by);

create index if not exists automations_organization_id_idx
  on public.automations(organization_id);

create index if not exists automations_created_by_idx
  on public.automations(created_by);

create index if not exists automation_runs_organization_id_idx
  on public.automation_runs(organization_id);

create index if not exists automation_runs_automation_id_idx
  on public.automation_runs(automation_id);

create index if not exists automation_runs_created_by_idx
  on public.automation_runs(created_by);

create index if not exists usage_events_user_id_idx
  on public.usage_events(user_id);

create index if not exists ai_provider_connections_created_by_idx
  on public.ai_provider_connections(created_by);
