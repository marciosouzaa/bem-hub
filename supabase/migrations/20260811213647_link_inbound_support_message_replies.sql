-- A provider quote is only a lookup key. The server validates endpoint,
-- organization, channel and conversation before persisting its internal link.

create function private.link_support_message_reply(
  target_webhook_endpoint_id uuid,
  target_message_id uuid,
  target_provider_message_id text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint_record public.channel_webhook_endpoints%rowtype;
  target_message public.support_messages%rowtype;
  quoted_message public.support_messages%rowtype;
begin
  if coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  ) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  select *
  into endpoint_record
  from public.channel_webhook_endpoints endpoint
  where endpoint.id = target_webhook_endpoint_id
    and endpoint.status = 'active';

  if endpoint_record.id is null then
    raise exception 'active_webhook_endpoint_not_found' using errcode = 'P0002';
  end if;

  if length(btrim(target_provider_message_id)) < 1
    or length(target_provider_message_id) > 300
  then
    raise exception 'invalid_reply_provider_message_id' using errcode = '22023';
  end if;

  select *
  into target_message
  from public.support_messages message
  where message.id = target_message_id
    and message.organization_id = endpoint_record.organization_id
    and message.channel_connection_id = endpoint_record.channel_connection_id
  for update;

  if target_message.id is null then
    raise exception 'support_message_not_found_for_webhook' using errcode = 'P0002';
  end if;

  if target_message.reply_to_message_id is not null then
    select *
    into quoted_message
    from public.support_messages message
    where message.id = target_message.reply_to_message_id
      and message.organization_id = endpoint_record.organization_id;

    return coalesce(
      quoted_message.external_message_id = btrim(target_provider_message_id),
      false
    );
  end if;

  select *
  into quoted_message
  from public.support_messages message
  where message.organization_id = endpoint_record.organization_id
    and message.channel_connection_id = endpoint_record.channel_connection_id
    and message.conversation_id = target_message.conversation_id
    and message.external_message_id = btrim(target_provider_message_id);

  if quoted_message.id is null then
    update public.support_messages
    set metadata = metadata || jsonb_build_object(
      'replyReferenceProviderMessageId', btrim(target_provider_message_id),
      'replyReferenceResolved', false
    )
    where id = target_message.id
      and organization_id = endpoint_record.organization_id;
    return false;
  end if;

  update public.support_messages
  set reply_to_message_id = quoted_message.id,
      metadata = metadata || jsonb_build_object(
        'replyReferenceProviderMessageId', btrim(target_provider_message_id),
        'replyReferenceResolved', true
      )
  where id = target_message.id
    and organization_id = endpoint_record.organization_id;

  return true;
end;
$$;

revoke all on function private.link_support_message_reply(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function private.link_support_message_reply(uuid, uuid, text)
  to service_role;

create function public.link_support_message_reply(
  target_webhook_endpoint_id uuid,
  target_message_id uuid,
  target_provider_message_id text
) returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.link_support_message_reply(
    target_webhook_endpoint_id,
    target_message_id,
    target_provider_message_id
  );
$$;

revoke all on function public.link_support_message_reply(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.link_support_message_reply(uuid, uuid, text)
  to service_role;
