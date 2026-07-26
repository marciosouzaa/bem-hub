alter table public.support_messages
  add constraint support_messages_organization_id_id_key
  unique (organization_id, id);

grant usage on schema private to service_role;

create table public.support_message_send_attempts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid not null,
  request_id uuid not null,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in (
    'sending',
    'sent',
    'failed',
    'uncertain'
  )),
  provider_message_id text,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint support_message_send_attempts_message_fkey
    foreign key (organization_id, message_id)
    references public.support_messages(organization_id, id)
    on delete cascade,
  constraint support_message_send_attempts_request_key
    unique (organization_id, request_id),
  constraint support_message_send_attempts_number_key
    unique (organization_id, message_id, attempt_number),
  constraint support_message_send_attempts_finished_check
    check (
      (status = 'sending' and finished_at is null)
      or (status <> 'sending' and finished_at is not null)
    )
);

create index support_message_send_attempts_message_started_idx
  on public.support_message_send_attempts(
    organization_id,
    message_id,
    started_at desc
  );

create index support_message_send_attempts_failed_idx
  on public.support_message_send_attempts(
    organization_id,
    finished_at desc
  )
  where status = 'failed';

alter table public.support_message_send_attempts enable row level security;

create policy "support_message_send_attempts_select_member"
on public.support_message_send_attempts
for select
to authenticated
using ((select public.is_org_member(organization_id)));

revoke all on table public.support_message_send_attempts
  from anon, authenticated, service_role;
grant select on table public.support_message_send_attempts
  to authenticated, service_role;

insert into public.support_message_send_attempts (
  organization_id,
  message_id,
  request_id,
  attempt_number,
  status,
  provider_message_id,
  error_code,
  metadata,
  started_at,
  finished_at
)
select
  message.organization_id,
  message.id,
  message.client_request_id,
  1,
  message.status,
  message.external_message_id,
  message.metadata ->> 'errorCode',
  jsonb_build_object('backfilled', true),
  message.created_at,
  case
    when message.status = 'sending' then null
    else coalesce(
      (message.metadata ->> 'deliveredAt')::timestamptz,
      (message.metadata ->> 'failedAt')::timestamptz,
      message.created_at
    )
  end
from public.support_messages message
where message.direction = 'outbound'
  and message.client_request_id is not null
  and message.status in ('sending', 'sent', 'failed')
on conflict (organization_id, request_id) do nothing;

create function private.begin_support_message_send(
  target_organization_id uuid,
  target_conversation_id uuid,
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
  conversation_record public.support_conversations%rowtype;
  target_message public.support_messages%rowtype;
  target_attempt public.support_message_send_attempts%rowtype;
  was_created boolean := false;
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
  then
    raise exception 'invalid_support_message' using errcode = '22023';
  end if;

  select *
  into conversation_record
  from public.support_conversations
  where id = target_conversation_id
    and organization_id = target_organization_id
  for update;

  if conversation_record.id is null
    or conversation_record.status = 'resolved'
  then
    raise exception 'support_conversation_not_found_or_resolved'
      using errcode = 'P0002';
  end if;

  if conversation_record.assigned_to is distinct from actor_id
    and actor_role not in ('owner', 'admin')
  then
    raise exception 'support_assignment_required' using errcode = '55000';
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
    conversation_record.channel_connection_id,
    'outbound',
    btrim(message_content),
    'sending',
    actor_id,
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

    select *
    into target_attempt
    from public.support_message_send_attempts attempt
    where attempt.organization_id = target_organization_id
      and attempt.request_id = request_id;

    if target_message.conversation_id <> target_conversation_id
      or target_message.content <> btrim(message_content)
    then
      raise exception 'support_message_request_conflict'
        using errcode = '22023';
    end if;
  else
    was_created := true;

    insert into public.support_message_send_attempts (
      organization_id,
      message_id,
      request_id,
      attempt_number,
      status
    ) values (
      target_organization_id,
      target_message.id,
      request_id,
      1,
      'sending'
    )
    returning * into target_attempt;

    update public.support_conversations
    set last_message_at = greatest(last_message_at, target_message.created_at)
    where id = target_conversation_id
      and organization_id = target_organization_id;
  end if;

  if target_message.id is null or target_attempt.id is null then
    raise exception 'support_message_attempt_not_found'
      using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'attemptId', target_attempt.id,
    'created', was_created,
    'messageId', target_message.id,
    'status', target_attempt.status
  );
end;
$$;

revoke all on function private.begin_support_message_send(
  uuid, uuid, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function private.begin_support_message_send(
  uuid, uuid, text, uuid
) to authenticated;

create or replace function public.begin_support_message_send(
  target_organization_id uuid,
  target_conversation_id uuid,
  message_content text,
  request_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.begin_support_message_send(
    target_organization_id,
    target_conversation_id,
    message_content,
    request_id
  );
$$;

revoke all on function public.begin_support_message_send(
  uuid, uuid, text, uuid
) from public, anon, authenticated;
grant execute on function public.begin_support_message_send(
  uuid, uuid, text, uuid
) to authenticated;

create function private.begin_support_message_retry(
  target_organization_id uuid,
  target_message_id uuid,
  request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.organization_role;
  conversation_record public.support_conversations%rowtype;
  target_message public.support_messages%rowtype;
  target_attempt public.support_message_send_attempts%rowtype;
  next_attempt_number integer;
begin
  if actor_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if request_id is null then
    raise exception 'invalid_support_retry' using errcode = '22023';
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

  select *
  into target_attempt
  from public.support_message_send_attempts attempt
  where attempt.organization_id = target_organization_id
    and attempt.request_id = request_id;

  if target_attempt.id is not null then
    if target_attempt.message_id <> target_message_id then
      raise exception 'support_retry_request_conflict'
        using errcode = '22023';
    end if;

    return jsonb_build_object(
      'attemptId', target_attempt.id,
      'created', false,
      'messageId', target_attempt.message_id,
      'status', target_attempt.status
    );
  end if;

  select message.*
  into target_message
  from public.support_messages message
  where message.id = target_message_id
    and message.organization_id = target_organization_id
    and message.direction = 'outbound'
  for update;

  if target_message.id is null then
    raise exception 'support_message_not_found' using errcode = 'P0002';
  end if;

  select *
  into conversation_record
  from public.support_conversations conversation
  where conversation.id = target_message.conversation_id
    and conversation.organization_id = target_organization_id
  for update;

  if conversation_record.id is null
    or conversation_record.status = 'resolved'
  then
    raise exception 'support_conversation_not_found_or_resolved'
      using errcode = 'P0002';
  end if;

  if conversation_record.assigned_to is distinct from actor_id
    and actor_role not in ('owner', 'admin')
  then
    raise exception 'support_assignment_required' using errcode = '55000';
  end if;

  if target_message.status <> 'failed' then
    raise exception 'support_message_not_retryable' using errcode = '55000';
  end if;

  select coalesce(max(attempt.attempt_number), 0) + 1
  into next_attempt_number
  from public.support_message_send_attempts attempt
  where attempt.organization_id = target_organization_id
    and attempt.message_id = target_message_id;

  insert into public.support_message_send_attempts (
    organization_id,
    message_id,
    request_id,
    attempt_number,
    status
  ) values (
    target_organization_id,
    target_message_id,
    request_id,
    next_attempt_number,
    'sending'
  )
  returning * into target_attempt;

  update public.support_messages
  set status = 'sending',
      metadata = metadata || jsonb_build_object(
        'lastRetryAt', now(),
        'lastRetryBy', actor_id,
        'retryCount', next_attempt_number - 1
      )
  where id = target_message_id
    and organization_id = target_organization_id;

  return jsonb_build_object(
    'attemptId', target_attempt.id,
    'created', true,
    'messageId', target_message_id,
    'status', target_attempt.status
  );
end;
$$;

revoke all on function private.begin_support_message_retry(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.begin_support_message_retry(uuid, uuid, uuid)
  to authenticated;

create function public.begin_support_message_retry(
  target_organization_id uuid,
  target_message_id uuid,
  request_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.begin_support_message_retry(
    target_organization_id,
    target_message_id,
    request_id
  );
$$;

revoke all on function public.begin_support_message_retry(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.begin_support_message_retry(uuid, uuid, uuid)
  to authenticated;

create function private.get_support_message_delivery_attempt(
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
    'encryptedCredentials', credentials.encrypted_credentials
  )
  from public.support_message_send_attempts attempt
  join public.support_messages message
    on message.id = attempt.message_id
    and message.organization_id = attempt.organization_id
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
      and contact_identity.channel_connection_id =
        conversation.channel_connection_id
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

revoke all on function private.get_support_message_delivery_attempt(
  uuid, uuid, uuid
) from public, anon, authenticated, service_role;
grant execute on function private.get_support_message_delivery_attempt(
  uuid, uuid, uuid
) to service_role;

create function public.get_support_message_delivery_attempt(
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

revoke all on function public.get_support_message_delivery_attempt(
  uuid, uuid, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.get_support_message_delivery_attempt(
  uuid, uuid, uuid
) to service_role;

create function private.finalize_support_message_send_attempt(
  target_organization_id uuid,
  target_message_id uuid,
  target_attempt_id uuid,
  delivery_status text,
  provider_message_id text,
  delivery_metadata jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_attempt public.support_message_send_attempts%rowtype;
begin
  if coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  ) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if delivery_status not in ('sent', 'failed', 'uncertain') then
    raise exception 'invalid_delivery_status' using errcode = '22023';
  end if;

  select *
  into target_attempt
  from public.support_message_send_attempts attempt
  where attempt.id = target_attempt_id
    and attempt.message_id = target_message_id
    and attempt.organization_id = target_organization_id
  for update;

  if target_attempt.id is null then
    raise exception 'support_message_attempt_not_found'
      using errcode = 'P0002';
  end if;

  if target_attempt.status <> 'sending' then
    return jsonb_build_object(
      'attemptId', target_attempt.id,
      'messageId', target_attempt.message_id,
      'status', target_attempt.status
    );
  end if;

  update public.support_message_send_attempts
  set status = delivery_status,
      provider_message_id = case
        when delivery_status = 'sent' then nullif(btrim(provider_message_id), '')
        else provider_message_id
      end,
      error_code = case
        when delivery_status = 'failed'
          then coalesce(delivery_metadata ->> 'errorCode', 'delivery_failed')
        else null
      end,
      metadata = metadata || coalesce(delivery_metadata, '{}'::jsonb),
      finished_at = now()
  where id = target_attempt_id
    and organization_id = target_organization_id
  returning * into target_attempt;

  update public.support_messages
  set status = case
        when delivery_status = 'uncertain' then 'sending'
        else delivery_status
      end,
      external_message_id = case
        when delivery_status = 'sent'
          then nullif(btrim(provider_message_id), '')
        else external_message_id
      end,
      metadata = metadata || coalesce(delivery_metadata, '{}'::jsonb)
  where id = target_message_id
    and organization_id = target_organization_id
    and direction = 'outbound'
    and status = 'sending';

  return jsonb_build_object(
    'attemptId', target_attempt.id,
    'messageId', target_attempt.message_id,
    'status', target_attempt.status
  );
end;
$$;

revoke all on function private.finalize_support_message_send_attempt(
  uuid, uuid, uuid, text, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function private.finalize_support_message_send_attempt(
  uuid, uuid, uuid, text, text, jsonb
) to service_role;

create function public.finalize_support_message_send_attempt(
  target_organization_id uuid,
  target_message_id uuid,
  target_attempt_id uuid,
  delivery_status text,
  provider_message_id text,
  delivery_metadata jsonb
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.finalize_support_message_send_attempt(
    target_organization_id,
    target_message_id,
    target_attempt_id,
    delivery_status,
    provider_message_id,
    delivery_metadata
  );
$$;

revoke all on function public.finalize_support_message_send_attempt(
  uuid, uuid, uuid, text, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.finalize_support_message_send_attempt(
  uuid, uuid, uuid, text, text, jsonb
) to service_role;
