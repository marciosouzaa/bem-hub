-- Reply delivery remains provider-neutral. The provider receives only a
-- server-resolved external message ID after tenant and conversation checks.

create function private.begin_support_message_reply(
  target_organization_id uuid,
  target_conversation_id uuid,
  message_content text,
  request_id uuid,
  target_reply_to_message_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  begin_result jsonb;
  target_message public.support_messages%rowtype;
  target_reply public.support_messages%rowtype;
begin
  begin_result := private.begin_support_message_send(
    target_organization_id,
    target_conversation_id,
    message_content,
    request_id
  );

  select *
  into target_message
  from public.support_messages message
  where message.id = (begin_result ->> 'messageId')::uuid
    and message.organization_id = target_organization_id;

  if target_message.id is null then
    raise exception 'support_reply_message_not_found' using errcode = 'P0002';
  end if;

  if target_message.reply_to_message_id is not null then
    if target_message.reply_to_message_id = target_reply_to_message_id then
      return begin_result;
    end if;

    raise exception 'support_message_request_conflict' using errcode = '22023';
  end if;

  select *
  into target_reply
  from public.support_messages message
  where message.id = target_reply_to_message_id
    and message.organization_id = target_organization_id
    and message.conversation_id = target_conversation_id
    and message.channel_connection_id = target_message.channel_connection_id;

  if target_reply.id is null then
    raise exception 'support_reply_target_not_found' using errcode = 'P0002';
  end if;

  if nullif(btrim(target_reply.external_message_id), '') is null then
    raise exception 'support_reply_target_not_delivered' using errcode = '22023';
  end if;

  update public.support_messages
  set reply_to_message_id = target_reply.id
  where id = target_message.id
    and organization_id = target_organization_id;

  return begin_result;
end;
$$;

revoke all on function private.begin_support_message_reply(uuid, uuid, text, uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.begin_support_message_reply(uuid, uuid, text, uuid, uuid)
  to authenticated;

create function public.begin_support_message_reply(
  target_organization_id uuid,
  target_conversation_id uuid,
  message_content text,
  request_id uuid,
  target_reply_to_message_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.begin_support_message_reply(
    target_organization_id,
    target_conversation_id,
    message_content,
    request_id,
    target_reply_to_message_id
  );
$$;

revoke all on function public.begin_support_message_reply(uuid, uuid, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.begin_support_message_reply(uuid, uuid, text, uuid, uuid)
  to authenticated;

create or replace function private.get_support_message_delivery_attempt(
  target_organization_id uuid,
  target_message_id uuid,
  target_attempt_id uuid
) returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'attemptId', attempt.id,
    'messageId', message.id,
    'conversationId', message.conversation_id,
    'content', message.content,
    'status', attempt.status,
    'provider', connection.provider,
    'connectionStatus', connection.status,
    'recipient', coalesce(identity.identity_value_normalized, contact.phone),
    'encryptedCredentials', credentials.encrypted_credentials,
    'replyTo', case
      when reply_message.id is null then null
      else jsonb_build_object(
        'direction', reply_message.direction,
        'externalMessageId', reply_message.external_message_id
      )
    end
  )
  from public.support_message_send_attempts attempt
  join public.support_messages message
    on message.id = attempt.message_id
    and message.organization_id = attempt.organization_id
  left join public.support_messages reply_message
    on reply_message.id = message.reply_to_message_id
    and reply_message.organization_id = message.organization_id
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
  where attempt.id = target_attempt_id
    and attempt.message_id = target_message_id
    and attempt.organization_id = target_organization_id
    and attempt.status = 'sending'
    and message.status = 'sending'
    and (
      current_setting('request.jwt.claims', true)::jsonb ->> 'role'
    ) = 'service_role';
$$;

revoke all on function private.get_support_message_delivery_attempt(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.get_support_message_delivery_attempt(uuid, uuid, uuid)
  to service_role;

create or replace function public.get_support_message_delivery_attempt(
  target_organization_id uuid,
  target_message_id uuid,
  target_attempt_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select private.get_support_message_delivery_attempt(
    target_organization_id,
    target_message_id,
    target_attempt_id
  );
$$;

revoke all on function public.get_support_message_delivery_attempt(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_support_message_delivery_attempt(uuid, uuid, uuid)
  to service_role;

create or replace function public.get_support_conversation(
  target_organization_id uuid,
  target_conversation_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'id', conversation.id,
    'status', conversation.status,
    'priority', conversation.priority,
    'contact', jsonb_build_object(
      'id', contact.id,
      'name', contact.name,
      'phone', contact.phone,
      'email', contact.email,
      'phoneStatus', contact.phone_normalization_status,
      'phoneReason', contact.phone_normalization_reason
    ),
    'channel', jsonb_build_object(
      'id', channel.id,
      'name', channel.display_name,
      'phoneNumber', channel.phone_number,
      'kind', channel.kind,
      'operationalStatus', case
        when channel.is_deleted then 'inactive'
        when channel.status = 'connected' then 'connected'
        else 'disconnected'
      end,
      'deletedAt', channel.deleted_at
    ),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', message.id,
        'direction', message.direction,
        'content', message.content,
        'status', message.status,
        'createdAt', message.created_at,
        'canReply', nullif(btrim(message.external_message_id), '') is not null,
        'replyTo', case
          when reply_message.id is null then null
          else jsonb_build_object(
            'id', reply_message.id,
            'direction', reply_message.direction,
            'content', reply_message.content
          )
        end
      ) order by message.created_at)
      from public.support_messages message
      left join public.support_messages reply_message
        on reply_message.id = message.reply_to_message_id
        and reply_message.organization_id = message.organization_id
      where message.conversation_id = conversation.id
        and message.organization_id = conversation.organization_id
    ), '[]'::jsonb)
  )
  from public.support_conversations conversation
  join public.contacts contact
    on contact.id = conversation.contact_id
  join public.channel_connections channel
    on channel.id = conversation.channel_connection_id
  where conversation.id = target_conversation_id
    and conversation.organization_id = target_organization_id
    and public.is_org_member(target_organization_id);
$$;

revoke all on function public.get_support_conversation(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_support_conversation(uuid, uuid)
  to authenticated;
