alter table public.support_messages
  add column client_request_id uuid;

create unique index support_messages_organization_client_request_idx
  on public.support_messages(organization_id, client_request_id)
  where client_request_id is not null;

alter table public.support_messages
  drop constraint if exists support_messages_status_check;

alter table public.support_messages
  add constraint support_messages_status_check
  check (status in (
    'received',
    'draft',
    'approved',
    'rejected',
    'sending',
    'sent',
    'failed'
  ));

create function public.begin_support_message_send(
  target_organization_id uuid,
  target_conversation_id uuid,
  message_content text,
  request_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_message public.support_messages%rowtype;
  target_channel_connection_id uuid;
  was_created boolean := false;
begin
  if not public.is_org_member(target_organization_id) then
    raise exception 'organization_member_required' using errcode = '42501';
  end if;
  if request_id is null
    or length(btrim(message_content)) < 1
    or length(message_content) > 10000
  then
    raise exception 'invalid_support_message' using errcode = '22023';
  end if;

  select channel_connection_id
  into target_channel_connection_id
  from public.support_conversations
  where id = target_conversation_id
    and organization_id = target_organization_id
    and status <> 'resolved';

  if target_channel_connection_id is null then
    raise exception 'support_conversation_not_found_or_resolved' using errcode = 'P0002';
  end if;

  insert into public.support_messages (
    organization_id,
    conversation_id,
    channel_connection_id,
    direction,
    content,
    status,
    sent_by,
    client_request_id,
    metadata
  ) values (
    target_organization_id,
    target_conversation_id,
    target_channel_connection_id,
    'outbound',
    btrim(message_content),
    'sending',
    auth.uid(),
    request_id,
    jsonb_build_object('source', 'bem_hub_app')
  )
  on conflict (
    organization_id,
    client_request_id
  ) where client_request_id is not null
  do nothing
  returning * into target_message;

  if target_message.id is null then
    select *
    into target_message
    from public.support_messages
    where organization_id = target_organization_id
      and client_request_id = request_id;
  else
    was_created := true;
    update public.support_conversations
    set last_message_at = greatest(last_message_at, target_message.created_at)
    where id = target_conversation_id
      and organization_id = target_organization_id;
  end if;

  return jsonb_build_object(
    'created', was_created,
    'messageId', target_message.id,
    'status', target_message.status
  );
end;
$$;

revoke all on function public.begin_support_message_send(
  uuid, uuid, text, uuid
) from public, anon, authenticated;
grant execute on function public.begin_support_message_send(
  uuid, uuid, text, uuid
) to authenticated;

create function public.get_support_message_delivery(
  target_organization_id uuid,
  target_message_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'messageId', message.id,
    'conversationId', message.conversation_id,
    'content', message.content,
    'status', message.status,
    'provider', connection.provider,
    'connectionStatus', connection.status,
    'recipient', coalesce(identity.identity_value_normalized, contact.phone),
    'encryptedCredentials', credentials.encrypted_credentials
  )
  from public.support_messages message
  join public.support_conversations conversation
    on conversation.id = message.conversation_id
    and conversation.organization_id = message.organization_id
  join public.contacts contact
    on contact.id = conversation.contact_id
    and contact.organization_id = conversation.organization_id
  join public.channel_connections connection
    on connection.id = message.channel_connection_id
    and connection.organization_id = message.organization_id
  join public.channel_credentials credentials
    on credentials.channel_connection_id = connection.id
    and credentials.organization_id = connection.organization_id
    and credentials.provider = connection.provider
  left join lateral (
    select contact_identity.identity_value_normalized
    from public.contact_identities contact_identity
    where contact_identity.organization_id = conversation.organization_id
      and contact_identity.channel_connection_id = conversation.channel_connection_id
      and contact_identity.contact_id = conversation.contact_id
    order by case contact_identity.identity_type
      when 'phone' then 1
      when 'remote_jid' then 2
      when 'wa_id' then 3
      when 'lid' then 4
      else 5
    end
    limit 1
  ) identity on true
  where message.id = target_message_id
    and message.organization_id = target_organization_id
    and message.direction = 'outbound';
$$;

revoke all on function public.get_support_message_delivery(
  uuid, uuid
) from public, anon, authenticated;
grant execute on function public.get_support_message_delivery(
  uuid, uuid
) to service_role;

create function public.finalize_support_message_send(
  target_organization_id uuid,
  target_message_id uuid,
  delivery_status text,
  provider_message_id text,
  delivery_metadata jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_message public.support_messages%rowtype;
begin
  if delivery_status not in ('sent', 'failed') then
    raise exception 'invalid_delivery_status' using errcode = '22023';
  end if;

  update public.support_messages
  set status = delivery_status,
      external_message_id = case
        when delivery_status = 'sent' then nullif(btrim(provider_message_id), '')
        else external_message_id
      end,
      metadata = metadata || coalesce(delivery_metadata, '{}'::jsonb)
  where id = target_message_id
    and organization_id = target_organization_id
    and direction = 'outbound'
    and status = 'sending'
  returning * into target_message;

  if target_message.id is null then
    select *
    into target_message
    from public.support_messages
    where id = target_message_id
      and organization_id = target_organization_id
      and direction = 'outbound';
  end if;

  if target_message.id is null then
    raise exception 'support_message_not_found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'messageId', target_message.id,
    'status', target_message.status
  );
end;
$$;

revoke all on function public.finalize_support_message_send(
  uuid, uuid, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.finalize_support_message_send(
  uuid, uuid, text, text, jsonb
) to service_role;

create or replace function public.ingest_channel_inbound_message(
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
  message_direction text;
  message_status text;
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
  if event_type not in ('message.received', 'message.sent_by_phone') then
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
  message_direction := case
    when event_type = 'message.sent_by_phone' then 'outbound'
    else 'inbound'
  end;
  message_status := case
    when event_type = 'message.sent_by_phone' then 'sent'
    else 'received'
  end;

  if length(btrim(provider_event_id)) < 1
    or length(provider_event_id) > 300
    or length(normalized_identity) < 3
    or length(normalized_identity) > 300
    or length(normalized_text) < 1
    or length(normalized_text) > 10000
    or payload_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_channel_message' using errcode = '22023';
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
  on conflict on constraint channel_webhook_events_channel_connection_id_provider_event_id_event_type_key
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
      message_direction,
      normalized_text,
      btrim(provider_event_id),
      message_status,
      jsonb_build_object(
        'provider', endpoint_record.provider,
        'source', case
          when event_type = 'message.sent_by_phone' then 'whatsapp_phone'
          else 'whatsapp_contact'
        end,
        'webhookEventId', webhook_event_id,
        'contactIdentityType', sender_identity_type,
        'contactIdentityValue', normalized_identity
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
