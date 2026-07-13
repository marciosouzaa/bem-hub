create table public.channel_connections (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null check (kind in ('official', 'unofficial')),
  provider text not null,
  display_name text not null,
  phone_number text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'disabled', 'failed')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, phone_number)
);

create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text,
  phone text,
  email text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, phone)
);

create table public.support_conversations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel_connection_id uuid not null references public.channel_connections(id) on delete restrict,
  assigned_to uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'escalated')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  content text not null,
  external_message_id text,
  status text not null default 'received' check (status in ('received', 'draft', 'approved', 'sent', 'failed')),
  sent_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, external_message_id)
);

create index channel_connections_organization_id_idx on public.channel_connections(organization_id);
create index contacts_organization_updated_idx on public.contacts(organization_id, updated_at desc);
create index support_conversations_organization_status_idx on public.support_conversations(organization_id, status, last_message_at desc);
create index support_conversations_contact_id_idx on public.support_conversations(contact_id);
create index support_conversations_channel_connection_id_idx on public.support_conversations(channel_connection_id);
create index support_messages_conversation_created_idx on public.support_messages(conversation_id, created_at);

alter table public.channel_connections enable row level security;
alter table public.contacts enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

create policy "channel_connections_select_member" on public.channel_connections for select to authenticated using (public.is_org_member(organization_id));
create policy "channel_connections_insert_admin" on public.channel_connections for insert to authenticated with check (public.is_org_admin(organization_id));
create policy "channel_connections_update_admin" on public.channel_connections for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy "channel_connections_delete_admin" on public.channel_connections for delete to authenticated using (public.is_org_admin(organization_id));
create policy "contacts_member" on public.contacts for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "support_conversations_member" on public.support_conversations for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "support_messages_member" on public.support_messages for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create or replace function public.get_support_inbox(target_organization_id uuid)
returns jsonb language sql security invoker set search_path = '' stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', sc.id, 'status', sc.status, 'priority', sc.priority,
    'lastMessageAt', sc.last_message_at, 'assignedTo', sc.assigned_to,
    'contact', jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'email', c.email, 'tags', c.tags),
    'channel', jsonb_build_object('id', cc.id, 'kind', cc.kind, 'provider', cc.provider, 'name', cc.display_name, 'phoneNumber', cc.phone_number)
  ) order by sc.last_message_at desc), '[]'::jsonb)
  from public.support_conversations sc
  join public.contacts c on c.id = sc.contact_id and c.organization_id = sc.organization_id
  join public.channel_connections cc on cc.id = sc.channel_connection_id and cc.organization_id = sc.organization_id
  where sc.organization_id = target_organization_id and public.is_org_member(target_organization_id);
$$;
revoke all on function public.get_support_inbox(uuid) from public, anon, authenticated;
grant execute on function public.get_support_inbox(uuid) to authenticated;
