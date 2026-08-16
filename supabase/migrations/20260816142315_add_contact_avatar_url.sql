alter table public.contacts
  add column if not exists avatar_url text,
  add column if not exists avatar_fetched_at timestamptz;

create or replace function public.list_contacts(target_organization_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', contact.id,
        'name', contact.name,
        'phone', contact.phone,
        'email', contact.email,
        'avatarUrl', contact.avatar_url,
        'tags', contact_tags.tags,
        'lifecycleStage', contact.lifecycle_stage,
        'phoneCountryCode', contact.phone_country_code,
        'phoneStatus', contact.phone_normalization_status,
        'phoneReason', contact.phone_normalization_reason,
        'updatedAt', contact.updated_at,
        'lastContactAt', activity.last_contact_at,
        'lastConversationId', activity.last_conversation_id,
        'conversationCount', activity.conversation_count,
        'channelNames', activity.channel_names
      )
      order by coalesce(activity.last_contact_at, contact.updated_at) desc
    ),
    '[]'::jsonb
  )
  from public.contacts contact
  left join lateral (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', tag.id,
          'name', tag.name,
          'hexColor', upper(tag.hex_color)
        )
        order by lower(tag.name), tag.id
      ),
      '[]'::jsonb
    ) as tags
    from public.contact_tag_assignments assignment
    join public.tags tag
      on tag.organization_id = assignment.organization_id
      and tag.id = assignment.tag_id
    where assignment.organization_id = contact.organization_id
      and assignment.contact_id = contact.id
  ) contact_tags on true
  left join lateral (
    select
      max(conversation.last_message_at) as last_contact_at,
      (array_agg(conversation.id order by conversation.last_message_at desc))[1]
        as last_conversation_id,
      count(conversation.id) as conversation_count,
      coalesce(
        array_agg(distinct channel.display_name order by channel.display_name)
          filter (where channel.display_name is not null),
        '{}'::text[]
      ) as channel_names
    from public.support_conversations conversation
    left join public.channel_connections channel
      on channel.id = conversation.channel_connection_id
      and channel.organization_id = conversation.organization_id
    where conversation.organization_id = contact.organization_id
      and conversation.contact_id = contact.id
  ) activity on true
  where contact.organization_id = target_organization_id
    and contact.archived_at is null
    and public.is_org_member(target_organization_id);
$$;

revoke all on function public.list_contacts(uuid)
  from public, anon, authenticated;
grant execute on function public.list_contacts(uuid)
  to authenticated;

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
        'unreadCount', coalesce(unread.total, 0),
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
      'avatarUrl', contact.avatar_url,
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
