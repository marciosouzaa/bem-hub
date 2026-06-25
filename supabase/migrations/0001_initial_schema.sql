create extension if not exists "uuid-ossp";
create extension if not exists vector with schema extensions;

create type public.organization_role as enum ('owner', 'admin', 'member');
create type public.member_status as enum ('active', 'invited', 'removed');
create type public.document_status as enum ('uploaded', 'processing', 'ready', 'failed');
create type public.run_status as enum ('queued', 'running', 'succeeded', 'failed');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'manual');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.plans (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  name text not null,
  price_monthly numeric(10, 2) not null default 0,
  limits jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status public.subscription_status not null default 'manual',
  current_period_start timestamptz,
  current_period_end timestamptz,
  gateway text,
  gateway_customer_id text,
  gateway_subscription_id text,
  created_at timestamptz not null default now(),
  unique (organization_id)
);

create table public.assistants (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  area text,
  instructions text not null,
  model text not null default 'gpt-5.5',
  temperature numeric(3, 2) not null default 0.4,
  is_default boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assistant_id uuid references public.assistants(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tokens_input integer,
  tokens_output integer,
  model text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.knowledge_bases (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  knowledge_base_id uuid references public.knowledge_bases(id) on delete set null,
  name text not null,
  file_path text not null,
  mime_type text not null,
  status public.document_status not null default 'uploaded',
  error text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.document_chunks (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  token_count integer,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create table public.automations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null default 'manual',
  template_key text not null,
  config jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.automation_runs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  automation_id uuid references public.automations(id) on delete set null,
  status public.run_status not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  status text not null default 'disconnected',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table public.usage_events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  model text,
  tokens_input integer,
  tokens_output integer,
  cost_estimate numeric(12, 6),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organization_members_user_id_idx on public.organization_members(user_id);
create index assistants_organization_id_idx on public.assistants(organization_id);
create index conversations_organization_id_idx on public.conversations(organization_id);
create index messages_conversation_id_idx on public.messages(conversation_id);
create index documents_organization_id_idx on public.documents(organization_id);
create index document_chunks_document_id_idx on public.document_chunks(document_id);
create index document_chunks_embedding_idx on public.document_chunks using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);
create index usage_events_organization_created_idx on public.usage_events(organization_id, created_at desc);

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role in ('owner', 'admin')
  );
$$;

create or replace function public.match_document_chunks(
  target_organization_id uuid,
  query_embedding extensions.vector(1536),
  match_count integer default 6
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity double precision
)
language sql
security definer
set search_path = public
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.organization_id = target_organization_id
    and public.is_org_member(target_organization_id)
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.assistants enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_bases enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.integrations enable row level security;
alter table public.usage_events enable row level security;

create policy "profiles_select_self" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid());

create policy "plans_select_all" on public.plans for select using (true);

create policy "organizations_select_member" on public.organizations for select using (public.is_org_member(id));
create policy "organizations_insert_authenticated" on public.organizations for insert with check (owner_id = auth.uid());
create policy "organizations_update_admin" on public.organizations for update using (public.is_org_admin(id));

create policy "organization_members_select_member" on public.organization_members for select using (public.is_org_member(organization_id));
create policy "organization_members_insert_admin" on public.organization_members for insert with check (public.is_org_admin(organization_id));
create policy "organization_members_update_admin" on public.organization_members for update using (public.is_org_admin(organization_id));

create policy "subscriptions_select_member" on public.subscriptions for select using (public.is_org_member(organization_id));
create policy "subscriptions_manage_admin" on public.subscriptions for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "assistants_select_member" on public.assistants for select using (public.is_org_member(organization_id));
create policy "assistants_manage_admin" on public.assistants for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "conversations_select_member" on public.conversations for select using (public.is_org_member(organization_id));
create policy "conversations_insert_member" on public.conversations for insert with check (public.is_org_member(organization_id) and user_id = auth.uid());
create policy "conversations_update_owner_or_admin" on public.conversations for update using (user_id = auth.uid() or public.is_org_admin(organization_id));

create policy "messages_select_member" on public.messages for select using (public.is_org_member(organization_id));
create policy "messages_insert_member" on public.messages for insert with check (public.is_org_member(organization_id));

create policy "knowledge_bases_select_member" on public.knowledge_bases for select using (public.is_org_member(organization_id));
create policy "knowledge_bases_manage_admin" on public.knowledge_bases for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "documents_select_member" on public.documents for select using (public.is_org_member(organization_id));
create policy "documents_manage_admin" on public.documents for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "document_chunks_select_member" on public.document_chunks for select using (public.is_org_member(organization_id));
create policy "document_chunks_manage_admin" on public.document_chunks for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "automations_select_member" on public.automations for select using (public.is_org_member(organization_id));
create policy "automations_manage_admin" on public.automations for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "automation_runs_select_member" on public.automation_runs for select using (public.is_org_member(organization_id));
create policy "automation_runs_insert_member" on public.automation_runs for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());

create policy "integrations_select_admin" on public.integrations for select using (public.is_org_admin(organization_id));
create policy "integrations_manage_admin" on public.integrations for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "usage_events_select_admin" on public.usage_events for select using (public.is_org_admin(organization_id));
create policy "usage_events_insert_member" on public.usage_events for insert with check (public.is_org_member(organization_id));

insert into public.plans (key, name, price_monthly, limits)
values
  ('free', 'Free', 0, '{"users":1,"assistants":1,"monthlyMessages":50,"documents":5,"integrations":0}'::jsonb),
  ('starter', 'Starter', 79, '{"users":3,"assistants":3,"monthlyMessages":800,"documents":50,"integrations":1}'::jsonb),
  ('pro', 'Pro', 299, '{"users":10,"assistants":15,"monthlyMessages":4000,"documents":500,"integrations":3}'::jsonb),
  ('business', 'Business', 599, '{"users":25,"assistants":50,"monthlyMessages":15000,"documents":3000,"integrations":10}'::jsonb);
