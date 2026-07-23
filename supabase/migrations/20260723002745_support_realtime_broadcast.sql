-- Hosted Supabase permits CREATE POLICY on realtime.messages, but ownership
-- restrictions reject DROP POLICY and COMMENT ON POLICY for this managed table.
create policy "support_members_receive_org_broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1
      from public.organization_members membership
      where membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and (select realtime.topic()) =
          'org:' || membership.organization_id::text || ':support'
    )
  );

create or replace function private.broadcast_support_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_row jsonb;
  target_organization_id uuid;
  target_conversation_id uuid;
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

  perform realtime.send(
    jsonb_build_object(
      'organizationId', target_organization_id,
      'conversationId', target_conversation_id,
      'entity', tg_table_name,
      'operation', lower(tg_op),
      'occurredAt', statement_timestamp()
    ),
    'support.inbox.changed',
    'org:' || target_organization_id::text || ':support',
    true
  );

  return null;
end;
$$;

revoke all on function private.broadcast_support_change()
  from public, anon, authenticated, service_role;

drop trigger if exists support_conversations_broadcast_lifecycle
  on public.support_conversations;
create trigger support_conversations_broadcast_lifecycle
after insert or delete
on public.support_conversations
for each row
execute function private.broadcast_support_change();

drop trigger if exists support_conversations_broadcast_state
  on public.support_conversations;
create trigger support_conversations_broadcast_state
after update of status, priority, assigned_to
on public.support_conversations
for each row
when (
  old.status is distinct from new.status
  or old.priority is distinct from new.priority
  or old.assigned_to is distinct from new.assigned_to
)
execute function private.broadcast_support_change();

drop trigger if exists support_messages_broadcast_change
  on public.support_messages;
create trigger support_messages_broadcast_change
after insert or update or delete
on public.support_messages
for each row
execute function private.broadcast_support_change();

comment on function private.broadcast_support_change() is
  'Emits provider-neutral support invalidation events without message content or provider payloads.';
