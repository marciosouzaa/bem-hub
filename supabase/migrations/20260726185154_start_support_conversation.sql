create function private.start_support_conversation(
  target_organization_id uuid,
  target_channel_connection_id uuid,
  contact_phone text,
  contact_name text,
  message_content text,
  request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.organization_role;
  channel_record public.channel_connections%rowtype;
  normalized_phone record;
  normalized_name text := nullif(left(btrim(coalesce(contact_name, '')), 200), '');
  target_contact public.contacts%rowtype;
  target_conversation public.support_conversations%rowtype;
  begin_result jsonb;
  conversation_was_created boolean := false;
begin
  if actor_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select member.role
  into actor_role
  from public.organization_members member
  where member.organization_id = target_organization_id
    and member.user_id = actor_id
    and member.status = 'active';

  if actor_role is null then
    raise exception 'organization_member_required' using errcode = '42501';
  end if;

  if request_id is null
    or length(btrim(message_content)) < 1
    or length(message_content) > 10000
    or length(btrim(coalesce(contact_name, ''))) > 200
  then
    raise exception 'invalid_support_conversation_start'
      using errcode = '22023';
  end if;

  select *
  into normalized_phone
  from private.normalize_contact_phone(contact_phone);

  if normalized_phone.normalization_status = 'invalid'
    or normalized_phone.canonical_phone is null
    or normalized_phone.match_key is null
  then
    raise exception 'invalid_support_contact_phone'
      using errcode = '22023';
  end if;

  select connection.*
  into channel_record
  from public.channel_connections connection
  where connection.id = target_channel_connection_id
    and connection.organization_id = target_organization_id;

  if channel_record.id is null then
    raise exception 'channel_connection_not_found' using errcode = 'P0002';
  end if;

  if channel_record.status <> 'connected' then
    raise exception 'channel_connection_not_ready' using errcode = '55000';
  end if;

  if channel_record.provider not in ('evolution', 'uazapi', 'wuzapi', 'z_api') then
    raise exception 'channel_provider_cannot_start_support'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.channel_credentials credentials
    where credentials.organization_id = target_organization_id
      and credentials.channel_connection_id = channel_record.id
      and credentials.provider = channel_record.provider
  ) then
    raise exception 'channel_credentials_not_found' using errcode = '55000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_organization_id::text || ':' || normalized_phone.match_key,
      0
    )
  );

  select contact.*
  into target_contact
  from public.contacts contact
  where contact.organization_id = target_organization_id
    and contact.phone_match_key = normalized_phone.match_key
  limit 1
  for update;

  if target_contact.id is null then
    insert into public.contacts (
      organization_id,
      name,
      phone,
      lifecycle_stage
    ) values (
      target_organization_id,
      normalized_name,
      normalized_phone.canonical_phone,
      'new'
    )
    returning * into target_contact;
  else
    update public.contacts
    set
      name = case
        when nullif(btrim(coalesce(name, '')), '') is null
          then coalesce(normalized_name, name)
        else name
      end,
      phone = normalized_phone.canonical_phone,
      archived_at = null,
      updated_at = now()
    where id = target_contact.id
      and organization_id = target_organization_id
    returning * into target_contact;
  end if;

  insert into public.contact_identities (
    organization_id,
    contact_id,
    channel_connection_id,
    identity_type,
    identity_value_normalized
  ) values (
    target_organization_id,
    target_contact.id,
    channel_record.id,
    'phone',
    normalized_phone.canonical_phone
  )
  on conflict (
    organization_id,
    channel_connection_id,
    identity_type,
    identity_value_normalized
  ) do update
  set
    contact_id = excluded.contact_id,
    updated_at = now();

  select conversation.*
  into target_conversation
  from public.support_conversations conversation
  where conversation.organization_id = target_organization_id
    and conversation.contact_id = target_contact.id
    and conversation.channel_connection_id = channel_record.id
    and conversation.status <> 'resolved'
  limit 1
  for update;

  if target_conversation.id is null then
    insert into public.support_conversations (
      organization_id,
      contact_id,
      channel_connection_id,
      status,
      last_message_at
    ) values (
      target_organization_id,
      target_contact.id,
      channel_record.id,
      'open',
      now()
    )
    returning * into target_conversation;
    conversation_was_created := true;
  end if;

  if target_conversation.assigned_to is null then
    perform private.manage_support_conversation(
      target_organization_id,
      target_conversation.id,
      'take',
      null,
      null,
      target_conversation.version
    );
  end if;

  begin_result := private.begin_support_message_send(
    target_organization_id,
    target_conversation.id,
    message_content,
    request_id
  );

  return begin_result || jsonb_build_object(
    'channelConnectionId', channel_record.id,
    'contactId', target_contact.id,
    'conversationCreated', conversation_was_created,
    'conversationId', target_conversation.id,
    'provider', channel_record.provider
  );
end;
$$;

revoke all on function private.start_support_conversation(
  uuid, uuid, text, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function private.start_support_conversation(
  uuid, uuid, text, text, text, uuid
) to authenticated;

create function public.start_support_conversation(
  target_organization_id uuid,
  target_channel_connection_id uuid,
  contact_phone text,
  contact_name text,
  message_content text,
  request_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.start_support_conversation(
    target_organization_id,
    target_channel_connection_id,
    contact_phone,
    contact_name,
    message_content,
    request_id
  );
$$;

revoke all on function public.start_support_conversation(
  uuid, uuid, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.start_support_conversation(
  uuid, uuid, text, text, text, uuid
) to authenticated;
