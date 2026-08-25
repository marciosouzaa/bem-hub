create or replace function public.get_support_inbox_operational(
  target_organization_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', conversation.id,
        'status', conversation.status,
        'priority', conversation.priority,
        'lastMessageAt', conversation.last_message_at,
        'assignedTo', conversation.assigned_to,
        'assignee', case
          when assignee.id is null then null
          else jsonb_build_object(
            'id', assignee.id,
            'name', assignee.name,
            'email', assignee.email
          )
        end,
        'unreadCount', case
          when coalesce(unread.total, 0) > 0 then unread.total
          when receipt.marked_unread_at is not null then 1
          else 0
        end,
        'isPinned', coalesce(receipt.pinned_at is not null, false),
        'pinnedAt', receipt.pinned_at,
        'markedUnreadAt', receipt.marked_unread_at,
        'departmentId', null,
        'department', null,
        'contact', jsonb_build_object(
          'id', contact.id,
          'name', contact.name,
          'phone', contact.phone,
          'email', contact.email,
          'avatarUrl', contact.avatar_url,
          'tags', contact_tags.names,
          'phoneStatus', contact.phone_normalization_status,
          'phoneReason', contact.phone_normalization_reason
        ),
        'channel', jsonb_build_object(
          'id', channel.id,
          'kind', channel.kind,
          'provider', channel.provider,
          'name', channel.display_name,
          'phoneNumber', channel.phone_number,
          'operationalStatus', case
            when channel.is_deleted then 'inactive'
            when channel.status = 'connected' then 'connected'
            else 'disconnected'
          end,
          'deletedAt', channel.deleted_at
        )
      )
      order by conversation.last_message_at desc
    ),
    '[]'::jsonb
  )
  from public.support_conversations conversation
  join public.contacts contact
    on contact.id = conversation.contact_id
    and contact.organization_id = conversation.organization_id
  join public.channel_connections channel
    on channel.id = conversation.channel_connection_id
    and channel.organization_id = conversation.organization_id
  left join public.profiles assignee
    on assignee.id = conversation.assigned_to
  left join public.support_conversation_reads receipt
    on receipt.organization_id = conversation.organization_id
    and receipt.conversation_id = conversation.id
    and receipt.user_id = (select auth.uid())
  left join lateral (
    select coalesce(
      array_agg(tag.name order by lower(tag.name), tag.id),
      '{}'::text[]
    ) as names
    from public.contact_tag_assignments assignment
    join public.tags tag
      on tag.organization_id = assignment.organization_id
      and tag.id = assignment.tag_id
    where assignment.organization_id = contact.organization_id
      and assignment.contact_id = contact.id
  ) contact_tags on true
  left join lateral (
    select count(*)::integer as total
    from public.support_messages message
    where message.organization_id = conversation.organization_id
      and message.conversation_id = conversation.id
      and message.direction = 'inbound'
      and (
        receipt.read_at is null
        or message.created_at > receipt.read_at
      )
  ) unread on true
  where conversation.organization_id = target_organization_id
    and (select public.is_org_member(target_organization_id));
$$;

revoke all on function public.get_support_inbox_operational(uuid)
  from public, anon, authenticated;
grant execute on function public.get_support_inbox_operational(uuid)
  to authenticated;
