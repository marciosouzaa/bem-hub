alter table public.channel_connections
  add column webhook_configured_at timestamptz;

create table public.channel_webhook_endpoints (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_connection_id uuid not null references public.channel_connections(id) on delete cascade,
  provider text not null,
  secret_hash text not null unique
    check (secret_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'provisioning'
    check (status in ('provisioning', 'active', 'failed', 'disabled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  configured_at timestamptz,
  last_received_at timestamptz,
  last_error_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_connection_id)
);

create index channel_webhook_endpoints_organization_id_idx
  on public.channel_webhook_endpoints(organization_id);

create table public.contact_identities (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel_connection_id uuid not null references public.channel_connections(id) on delete cascade,
  identity_type text not null
    check (identity_type in ('phone', 'wa_id', 'remote_jid', 'lid')),
  identity_value_normalized text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (
    organization_id,
    channel_connection_id,
    identity_type,
    identity_value_normalized
  )
);

create index contact_identities_contact_id_idx
  on public.contact_identities(contact_id);

create index contact_identities_channel_connection_id_idx
  on public.contact_identities(channel_connection_id);

create table public.channel_webhook_events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  webhook_endpoint_id uuid not null references public.channel_webhook_endpoints(id) on delete cascade,
  channel_connection_id uuid not null references public.channel_connections(id) on delete cascade,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_sha256 text not null
    check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'failed')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  provider_occurred_at timestamptz,
  processed_at timestamptz,
  last_attempt_at timestamptz not null default now(),
  error_code text,
  error_message text,
  received_at timestamptz not null default now(),
  unique (channel_connection_id, provider_event_id, event_type)
);

create index channel_webhook_events_organization_received_idx
  on public.channel_webhook_events(organization_id, received_at desc);

create index channel_webhook_events_status_attempt_idx
  on public.channel_webhook_events(status, last_attempt_at)
  where status in ('received', 'failed');

alter table public.channel_webhook_endpoints enable row level security;
alter table public.contact_identities enable row level security;
alter table public.channel_webhook_events enable row level security;

revoke all on table public.channel_webhook_endpoints
  from public, anon, authenticated;
revoke all on table public.channel_webhook_events
  from public, anon, authenticated;
revoke all on table public.contact_identities
  from public, anon, authenticated;

grant all on table public.channel_webhook_endpoints to service_role;
grant all on table public.channel_webhook_events to service_role;
grant all on table public.contact_identities to service_role;

create policy "channel_webhook_endpoints_service_only"
  on public.channel_webhook_endpoints
  for all to service_role
  using (true)
  with check (true);

create policy "channel_webhook_events_service_only"
  on public.channel_webhook_events
  for all to service_role
  using (true)
  with check (true);

create policy "channel_credentials_service_only"
  on public.channel_credentials
  for all to service_role
  using (true)
  with check (true);

create policy "contact_identities_service_only"
  on public.contact_identities
  for all to service_role
  using (true)
  with check (true);

alter table public.support_messages
  add column channel_connection_id uuid;

update public.support_messages sm
set channel_connection_id = sc.channel_connection_id
from public.support_conversations sc
where sc.id = sm.conversation_id
  and sc.organization_id = sm.organization_id
  and sm.channel_connection_id is null;

alter table public.support_messages
  alter column channel_connection_id set not null,
  add constraint support_messages_channel_connection_id_fkey
    foreign key (channel_connection_id)
    references public.channel_connections(id)
    on delete restrict;

alter table public.support_messages
  drop constraint if exists support_messages_organization_id_external_message_id_key;

create unique index support_messages_provider_message_idx
  on public.support_messages(
    organization_id,
    channel_connection_id,
    external_message_id
  )
  where external_message_id is not null;

alter table public.contacts
  drop constraint if exists contacts_organization_id_phone_key;

create unique index contacts_organization_phone_idx
  on public.contacts(organization_id, phone)
  where phone is not null;

create unique index support_conversations_one_active_idx
  on public.support_conversations(
    organization_id,
    contact_id,
    channel_connection_id
  )
  where status <> 'resolved';

create or replace function public.create_support_draft(
  target_organization_id uuid,
  target_conversation_id uuid,
  draft_content text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
  target_channel_connection_id uuid;
begin
  if not public.is_org_member(target_organization_id) then
    raise exception 'organization_member_required' using errcode = '42501';
  end if;
  if length(btrim(draft_content)) < 1 or length(draft_content) > 10000 then
    raise exception 'invalid_draft_content' using errcode = '22023';
  end if;

  select channel_connection_id
  into target_channel_connection_id
  from public.support_conversations
  where id = target_conversation_id
    and organization_id = target_organization_id
    and status <> 'resolved';

  if target_channel_connection_id is null then
    raise exception 'support_conversation_not_found_or_resolved'
      using errcode = 'P0002';
  end if;

  insert into public.support_messages (
    organization_id,
    conversation_id,
    channel_connection_id,
    direction,
    content,
    status,
    sent_by
  ) values (
    target_organization_id,
    target_conversation_id,
    target_channel_connection_id,
    'outbound',
    btrim(draft_content),
    'draft',
    auth.uid()
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.create_support_draft(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.create_support_draft(uuid, uuid, text)
  to authenticated;

create function public.ingest_channel_inbound_message(
  target_webhook_endpoint_id uuid,
  provider_event_id text,
  event_type text,
  sender_identity_type text,
  sender_identity_value text,
  sender_phone text,
  sender_name text,
  message_text text,
  provider_occurred_at timestamptz,
  payload_sha256 text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  endpoint_record record;
  webhook_event_id uuid;
  webhook_event_status text;
  target_contact_id uuid;
  target_conversation_id uuid;
  target_message_id uuid;
  normalized_identity text;
  normalized_phone text;
  normalized_name text;
  normalized_text text;
  event_timestamp timestamptz;
begin
  select
    endpoint.id,
    endpoint.organization_id,
    endpoint.channel_connection_id,
    endpoint.provider
  into endpoint_record
  from public.channel_webhook_endpoints endpoint
  join public.channel_connections connection
    on connection.id = endpoint.channel_connection_id
    and connection.organization_id = endpoint.organization_id
    and connection.provider = endpoint.provider
  where endpoint.id = target_webhook_endpoint_id
    and endpoint.status = 'active';

  if endpoint_record.id is null then
    raise exception 'active_webhook_endpoint_not_found' using errcode = 'P0002';
  end if;
  if event_type <> 'message.received' then
    raise exception 'unsupported_channel_event' using errcode = '22023';
  end if;
  if sender_identity_type not in ('phone', 'wa_id', 'remote_jid', 'lid') then
    raise exception 'invalid_sender_identity_type' using errcode = '22023';
  end if;

  normalized_identity := btrim(sender_identity_value);
  normalized_phone := nullif(regexp_replace(coalesce(sender_phone, ''), '[^0-9]', '', 'g'), '');
  normalized_name := nullif(left(btrim(coalesce(sender_name, '')), 200), '');
  normalized_text := btrim(message_text);
  event_timestamp := coalesce(provider_occurred_at, now());

  if length(btrim(provider_event_id)) < 1
    or length(provider_event_id) > 300
    or length(normalized_identity) < 3
    or length(normalized_identity) > 300
    or length(normalized_text) < 1
    or length(normalized_text) > 10000
    or payload_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_inbound_message' using errcode = '22023';
  end if;

  if normalized_phone is not null
    and (length(normalized_phone) < 10 or length(normalized_phone) > 15)
  then
    normalized_phone := null;
  end if;

  insert into public.channel_webhook_events (
    organization_id,
    webhook_endpoint_id,
    channel_connection_id,
    provider,
    provider_event_id,
    event_type,
    payload_sha256,
    provider_occurred_at
  ) values (
    endpoint_record.organization_id,
    endpoint_record.id,
    endpoint_record.channel_connection_id,
    endpoint_record.provider,
    btrim(provider_event_id),
    event_type,
    payload_sha256,
    provider_occurred_at
  )
  on conflict (channel_connection_id, provider_event_id, event_type)
  do update set
    attempt_count = public.channel_webhook_events.attempt_count + 1,
    last_attempt_at = now()
  returning id, status
  into webhook_event_id, webhook_event_status;

  if webhook_event_status = 'processed' then
    select id, conversation_id
    into target_message_id, target_conversation_id
    from public.support_messages
    where organization_id = endpoint_record.organization_id
      and channel_connection_id = endpoint_record.channel_connection_id
      and external_message_id = btrim(provider_event_id);

    return jsonb_build_object(
      'duplicate', true,
      'eventId', webhook_event_id,
      'conversationId', target_conversation_id,
      'messageId', target_message_id,
      'status', 'processed'
    );
  end if;

  begin
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      endpoint_record.organization_id::text || ':' ||
      endpoint_record.channel_connection_id::text || ':' ||
      sender_identity_type || ':' || normalized_identity,
      0
    ));

    select contact_id
    into target_contact_id
    from public.contact_identities
    where organization_id = endpoint_record.organization_id
      and channel_connection_id = endpoint_record.channel_connection_id
      and identity_type = sender_identity_type
      and identity_value_normalized = normalized_identity;

    if target_contact_id is null and normalized_phone is not null then
      select id
      into target_contact_id
      from public.contacts
      where organization_id = endpoint_record.organization_id
        and phone = normalized_phone;
    end if;

    if target_contact_id is null then
      insert into public.contacts (
        organization_id,
        name,
        phone
      ) values (
        endpoint_record.organization_id,
        normalized_name,
        normalized_phone
      )
      returning id into target_contact_id;
    else
      update public.contacts
      set name = case
            when nullif(btrim(coalesce(name, '')), '') is null
              then coalesce(normalized_name, name)
            else name
          end,
          phone = coalesce(phone, normalized_phone),
          updated_at = now()
      where id = target_contact_id
        and organization_id = endpoint_record.organization_id;
    end if;

    insert into public.contact_identities (
      organization_id,
      contact_id,
      channel_connection_id,
      identity_type,
      identity_value_normalized
    ) values (
      endpoint_record.organization_id,
      target_contact_id,
      endpoint_record.channel_connection_id,
      sender_identity_type,
      normalized_identity
    )
    on conflict (
      organization_id,
      channel_connection_id,
      identity_type,
      identity_value_normalized
    ) do update
    set updated_at = now();

    insert into public.support_conversations (
      organization_id,
      contact_id,
      channel_connection_id,
      status,
      last_message_at
    ) values (
      endpoint_record.organization_id,
      target_contact_id,
      endpoint_record.channel_connection_id,
      'open',
      event_timestamp
    )
    on conflict (
      organization_id,
      contact_id,
      channel_connection_id
    ) where status <> 'resolved'
    do update set
      last_message_at = greatest(
        public.support_conversations.last_message_at,
        excluded.last_message_at
      )
    returning id into target_conversation_id;

    insert into public.support_messages (
      organization_id,
      conversation_id,
      channel_connection_id,
      direction,
      content,
      external_message_id,
      status,
      metadata,
      created_at
    ) values (
      endpoint_record.organization_id,
      target_conversation_id,
      endpoint_record.channel_connection_id,
      'inbound',
      normalized_text,
      btrim(provider_event_id),
      'received',
      jsonb_build_object(
        'provider', endpoint_record.provider,
        'webhookEventId', webhook_event_id,
        'senderIdentityType', sender_identity_type,
        'senderIdentityValue', normalized_identity
      ),
      event_timestamp
    )
    on conflict (
      organization_id,
      channel_connection_id,
      external_message_id
    ) where external_message_id is not null
    do nothing
    returning id into target_message_id;

    if target_message_id is null then
      select id, conversation_id
      into target_message_id, target_conversation_id
      from public.support_messages
      where organization_id = endpoint_record.organization_id
        and channel_connection_id = endpoint_record.channel_connection_id
        and external_message_id = btrim(provider_event_id);
    end if;

    update public.support_conversations
    set last_message_at = greatest(last_message_at, event_timestamp)
    where id = target_conversation_id
      and organization_id = endpoint_record.organization_id;

    update public.channel_webhook_events
    set status = 'processed',
        processed_at = now(),
        error_code = null,
        error_message = null
    where id = webhook_event_id;

    update public.channel_webhook_endpoints
    set last_received_at = now(),
        last_error_at = null,
        last_error_code = null,
        updated_at = now()
    where id = endpoint_record.id;

    update public.channel_connections
    set webhook_verified_at = coalesce(webhook_verified_at, now())
    where id = endpoint_record.channel_connection_id
      and organization_id = endpoint_record.organization_id;

    return jsonb_build_object(
      'duplicate', false,
      'eventId', webhook_event_id,
      'conversationId', target_conversation_id,
      'messageId', target_message_id,
      'status', 'processed'
    );
  exception when others then
    update public.channel_webhook_events
    set status = 'failed',
        error_code = sqlstate,
        error_message = left(sqlerrm, 500),
        last_attempt_at = now()
    where id = webhook_event_id;

    update public.channel_webhook_endpoints
    set last_error_at = now(),
        last_error_code = sqlstate,
        updated_at = now()
    where id = endpoint_record.id;

    return jsonb_build_object(
      'duplicate', false,
      'eventId', webhook_event_id,
      'status', 'failed',
      'errorCode', sqlstate
    );
  end;
end;
$$;

revoke all on function public.ingest_channel_inbound_message(
  uuid, text, text, text, text, text, text, text, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.ingest_channel_inbound_message(
  uuid, text, text, text, text, text, text, text, timestamptz, text
) to service_role;

create or replace function public.list_channel_connections(
  target_organization_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'kind', kind,
    'provider', provider,
    'name', display_name,
    'phoneNumber', phone_number,
    'status', status,
    'authMethod', auth_method,
    'externalInstanceId', external_instance_id,
    'providerBaseUrl', provider_base_url,
    'statusReason', status_reason,
    'lastHealthAt', last_health_at,
    'lastConnectedAt', last_connected_at,
    'credentialUpdatedAt', credential_updated_at,
    'webhookConfiguredAt', webhook_configured_at,
    'webhookVerifiedAt', webhook_verified_at,
    'hasCredentials', credential_updated_at is not null
  ) order by created_at), '[]'::jsonb)
  from public.channel_connections
  where organization_id = target_organization_id
    and public.is_org_member(target_organization_id);
$$;
