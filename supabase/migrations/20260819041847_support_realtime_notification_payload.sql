create or replace function private.broadcast_support_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_row jsonb;
  event_payload jsonb;
  target_organization_id uuid;
  target_conversation_id uuid;
  conversation_assigned_to uuid;
begin
  changed_row := case
    when tg_op = 'DELETE' then to_jsonb(old)
    else to_jsonb(new)
  end;
  target_organization_id := (changed_row ->> 'organization_id')::uuid;
  target_conversation_id := case
    when tg_table_name = 'support_conversations'
      then (changed_row ->> 'id')::uuid
    else (changed_row ->> 'conversation_id')::uuid
  end;

  event_payload := jsonb_build_object(
    'organizationId', target_organization_id,
    'conversationId', target_conversation_id,
    'entity', tg_table_name,
    'operation', lower(tg_op),
    'occurredAt', statement_timestamp()
  );

  if tg_table_name = 'support_messages' then
    select conversation.assigned_to
    into conversation_assigned_to
    from public.support_conversations conversation
    where conversation.organization_id = target_organization_id
      and conversation.id = target_conversation_id;

    event_payload := event_payload || jsonb_build_object(
      'messageId', changed_row ->> 'id',
      'messageDirection', changed_row ->> 'direction',
      'messageStatus', changed_row ->> 'status',
      'messageActorId', changed_row ->> 'sent_by',
      'messageSource', changed_row #>> '{metadata,source}',
      'messageCreatedAt', changed_row ->> 'created_at',
      'conversationAssignedTo', conversation_assigned_to
    );
  end if;

  perform realtime.send(
    event_payload,
    'support.inbox.changed',
    'org:' || target_organization_id::text || ':support',
    true
  );

  return null;
end;
$$;

revoke all on function private.broadcast_support_change()
  from public, anon, authenticated, service_role;
