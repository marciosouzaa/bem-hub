-- WhatsApp media is private tenant data. Browser clients never receive a
-- provider URL or provider credential; binary transfer is performed by server
-- code and rendered through short-lived Storage URLs in a later delivery slice.

alter table public.support_messages
  add column reply_to_message_id uuid,
  add constraint support_messages_id_organization_id_key
    unique (id, organization_id),
  add constraint support_messages_reply_to_message_fkey
    foreign key (reply_to_message_id, organization_id)
    references public.support_messages(id, organization_id)
    on delete restrict;

create table public.support_message_attachments (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null,
  media_type text not null
    check (media_type in ('audio', 'document', 'image', 'video')),
  mime_type text not null check (length(btrim(mime_type)) between 3 and 200),
  file_name text check (file_name is null or length(btrim(file_name)) between 1 and 255),
  byte_size bigint not null check (byte_size >= 0 and byte_size <= 26214400),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  storage_bucket text not null default 'support-message-media'
    check (storage_bucket = 'support-message-media'),
  storage_object_path text not null unique
    check (storage_object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}(/[^/]+)?$'),
  status text not null default 'pending'
    check (status in ('pending', 'available', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  available_at timestamptz,
  failed_at timestamptz,
  constraint support_message_attachments_message_fkey
    foreign key (message_id, organization_id)
    references public.support_messages(id, organization_id)
    on delete cascade
);

create index support_message_attachments_message_created_idx
  on public.support_message_attachments(organization_id, message_id, created_at);

create table public.support_message_reactions (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null,
  channel_connection_id uuid not null references public.channel_connections(id) on delete restrict,
  external_reaction_id text,
  actor_identity_type text not null
    check (actor_identity_type in ('phone', 'wa_id', 'remote_jid', 'lid', 'business')),
  actor_identity_value text not null check (length(btrim(actor_identity_value)) between 1 and 300),
  emoji text not null check (length(btrim(emoji)) between 1 and 32),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint support_message_reactions_message_fkey
    foreign key (message_id, organization_id)
    references public.support_messages(id, organization_id)
    on delete cascade
);

create unique index support_message_reactions_provider_idx
  on public.support_message_reactions(
    organization_id,
    channel_connection_id,
    external_reaction_id
  ) where external_reaction_id is not null;

create index support_message_reactions_message_created_idx
  on public.support_message_reactions(organization_id, message_id, created_at);

alter table public.support_message_attachments enable row level security;
alter table public.support_message_reactions enable row level security;

revoke all on table public.support_message_attachments
  from public, anon, authenticated;
revoke all on table public.support_message_reactions
  from public, anon, authenticated;
grant select on table public.support_message_attachments to authenticated;
grant select on table public.support_message_reactions to authenticated;
grant all on table public.support_message_attachments to service_role;
grant all on table public.support_message_reactions to service_role;

create policy "support_message_attachments_select_member"
  on public.support_message_attachments
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "support_message_reactions_select_member"
  on public.support_message_reactions
  for select to authenticated
  using (public.is_org_member(organization_id));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'support-message-media',
  'support-message-media',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/plain',
    'video/mp4'
  ]
) on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "support_message_media_select_member"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-message-media'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
