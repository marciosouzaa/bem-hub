alter table public.channel_connections
  add column is_deleted boolean not null default false,
  add column deleted_at timestamptz,
  add constraint channel_connections_deletion_state_check
    check (
      (
        is_deleted = false
        and deleted_at is null
      )
      or (
        is_deleted = true
        and deleted_at is not null
        and status = 'disabled'
      )
    );

drop policy if exists "channel_connections_delete_admin"
  on public.channel_connections;

revoke delete on table public.channel_connections from authenticated;
grant select, insert, update
  on table public.channel_connections
  to authenticated;

grant select
  on table
    public.profiles,
    public.organization_members,
    public.contacts,
    public.support_conversations,
    public.support_messages,
    public.support_conversation_reads,
    public.contact_tag_assignments,
    public.tags
  to authenticated;

alter table public.channel_connections
  drop constraint channel_connections_organization_id_phone_number_key;

create unique index channel_connections_active_phone_number_idx
  on public.channel_connections(organization_id, phone_number)
  where is_deleted = false
    and phone_number is not null;

drop index if exists public.channel_connections_provider_instance_idx;
create unique index channel_connections_provider_instance_idx
  on public.channel_connections(
    organization_id,
    provider,
    external_instance_id
  )
  where is_deleted = false
    and external_instance_id is not null;

drop index if exists public.channel_connections_managed_request_idx;
create unique index channel_connections_managed_request_idx
  on public.channel_connections(organization_id, managed_request_id)
  where is_deleted = false
    and managed_request_id is not null;

create or replace function public.delete_channel_connection(
  target_organization_id uuid,
  target_connection_id uuid
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  update public.channel_connections
  set
    is_deleted = true,
    deleted_at = coalesce(deleted_at, now()),
    status = 'disabled',
    status_reason = 'Canal removido da operação.'
  where id = target_connection_id
    and organization_id = target_organization_id;

  if not found then
    raise exception 'channel_not_found' using errcode = 'P0002';
  end if;
end;
$$;

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
    'managementMode', management_mode,
    'managedRequestId', case
      when management_mode = 'managed' then managed_request_id
      else null
    end,
    'externalInstanceId', case
      when management_mode = 'managed' then null
      else external_instance_id
    end,
    'providerBaseUrl', case
      when management_mode = 'managed' then null
      else provider_base_url
    end,
    'statusReason', status_reason,
    'lastHealthAt', last_health_at,
    'lastConnectedAt', last_connected_at,
    'credentialUpdatedAt', credential_updated_at,
    'webhookConfiguredAt', webhook_configured_at,
    'webhookVerifiedAt', webhook_verified_at,
    'provisionedAt', provisioned_at,
    'deprovisionedAt', deprovisioned_at,
    'hasCredentials', credential_updated_at is not null
  ) order by created_at), '[]'::jsonb)
  from public.channel_connections
  where organization_id = target_organization_id
    and is_deleted = false
    and public.is_org_member(target_organization_id);
$$;

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
        'createdAt', message.created_at
      ) order by message.created_at)
      from public.support_messages message
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
