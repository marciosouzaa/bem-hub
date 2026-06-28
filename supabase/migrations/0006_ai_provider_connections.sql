create table public.ai_provider_connections (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'gemini', 'open-source')),
  name text not null,
  status text not null default 'active' check (status in ('active', 'needs_attention', 'disabled')),
  encrypted_api_key text not null,
  key_hint text,
  default_model text,
  available_models jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, name)
);

alter table public.assistants
  add column provider text not null default 'openai' check (provider in ('openai', 'anthropic', 'gemini', 'open-source')),
  add column provider_connection_id uuid references public.ai_provider_connections(id) on delete set null;

create unique index ai_provider_connections_default_idx
  on public.ai_provider_connections (organization_id, provider)
  where is_default;

create index ai_provider_connections_organization_id_idx
  on public.ai_provider_connections(organization_id);

create index assistants_provider_connection_id_idx
  on public.assistants(provider_connection_id);

alter table public.ai_provider_connections enable row level security;

create policy "ai_provider_connections_select_member"
  on public.ai_provider_connections
  for select
  using (public.is_org_member(organization_id));

create policy "ai_provider_connections_manage_admin"
  on public.ai_provider_connections
  for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
