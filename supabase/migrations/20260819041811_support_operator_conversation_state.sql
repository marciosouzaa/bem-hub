alter table public.support_conversation_reads
  add column if not exists marked_unread_at timestamptz,
  add column if not exists pinned_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists support_conversation_reads_org_user_pinned_idx
  on public.support_conversation_reads(organization_id, user_id, pinned_at desc)
  where pinned_at is not null;

revoke all on table public.support_conversation_reads
  from anon, authenticated;
grant select on table public.support_conversation_reads
  to authenticated;

create or replace function private.mark_support_conversation_read(
  target_organization_id uuid,
  target_conversation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  latest_message_id uuid;
  read_timestamp timestamptz := now();
  pinned_timestamp timestamptz;
begin
  if actor_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = actor_id
      and member.status = 'active'
  ) then
    raise exception 'organization_member_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.support_conversations conversation
    where conversation.id = target_conversation_id
      and conversation.organization_id = target_organization_id
  ) then
    raise exception 'support_conversation_not_found' using errcode = 'P0002';
  end if;

  select message.id
  into latest_message_id
  from public.support_messages message
  where message.organization_id = target_organization_id
    and message.conversation_id = target_conversation_id
  order by message.created_at desc, message.id desc
  limit 1;

  insert into public.support_conversation_reads (
    organization_id,
    conversation_id,
    user_id,
    last_read_message_id,
    read_at,
    marked_unread_at,
    updated_at
  ) values (
    target_organization_id,
    target_conversation_id,
    actor_id,
    latest_message_id,
    read_timestamp,
    null,
    read_timestamp
  )
  on conflict (organization_id, conversation_id, user_id)
  do update set
    last_read_message_id = excluded.last_read_message_id,
    read_at = excluded.read_at,
    marked_unread_at = null,
    updated_at = excluded.updated_at
  returning pinned_at into pinned_timestamp;

  return jsonb_build_object(
    'conversationId', target_conversation_id,
    'lastReadMessageId', latest_message_id,
    'readAt', read_timestamp,
    'markedUnreadAt', null,
    'pinnedAt', pinned_timestamp
  );
end;
$$;

revoke all on function private.mark_support_conversation_read(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.mark_support_conversation_read(uuid, uuid)
  to authenticated;

create or replace function public.mark_support_conversation_read(
  target_organization_id uuid,
  target_conversation_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.mark_support_conversation_read(
    target_organization_id,
    target_conversation_id
  );
$$;

revoke all on function public.mark_support_conversation_read(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.mark_support_conversation_read(uuid, uuid)
  to authenticated;

create function private.mark_support_conversation_unread(
  target_organization_id uuid,
  target_conversation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  unread_timestamp timestamptz := now();
  pinned_timestamp timestamptz;
begin
  if actor_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = actor_id
      and member.status = 'active'
  ) then
    raise exception 'organization_member_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.support_conversations conversation
    where conversation.id = target_conversation_id
      and conversation.organization_id = target_organization_id
  ) then
    raise exception 'support_conversation_not_found' using errcode = 'P0002';
  end if;

  insert into public.support_conversation_reads (
    organization_id,
    conversation_id,
    user_id,
    marked_unread_at,
    updated_at
  ) values (
    target_organization_id,
    target_conversation_id,
    actor_id,
    unread_timestamp,
    unread_timestamp
  )
  on conflict (organization_id, conversation_id, user_id)
  do update set
    marked_unread_at = excluded.marked_unread_at,
    updated_at = excluded.updated_at
  returning pinned_at into pinned_timestamp;

  return jsonb_build_object(
    'conversationId', target_conversation_id,
    'markedUnreadAt', unread_timestamp,
    'pinnedAt', pinned_timestamp
  );
end;
$$;

revoke all on function private.mark_support_conversation_unread(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.mark_support_conversation_unread(uuid, uuid)
  to authenticated;

create function public.mark_support_conversation_unread(
  target_organization_id uuid,
  target_conversation_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.mark_support_conversation_unread(
    target_organization_id,
    target_conversation_id
  );
$$;

revoke all on function public.mark_support_conversation_unread(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.mark_support_conversation_unread(uuid, uuid)
  to authenticated;

create function private.set_support_conversation_pinned(
  target_organization_id uuid,
  target_conversation_id uuid,
  should_pin boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  state_timestamp timestamptz := now();
  pinned_timestamp timestamptz;
  manual_unread_timestamp timestamptz;
begin
  if actor_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if should_pin is null then
    raise exception 'invalid_pinned_state' using errcode = '22004';
  end if;

  if not exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = actor_id
      and member.status = 'active'
  ) then
    raise exception 'organization_member_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.support_conversations conversation
    where conversation.id = target_conversation_id
      and conversation.organization_id = target_organization_id
  ) then
    raise exception 'support_conversation_not_found' using errcode = 'P0002';
  end if;

  if should_pin then
    insert into public.support_conversation_reads (
      organization_id,
      conversation_id,
      user_id,
      pinned_at,
      updated_at
    ) values (
      target_organization_id,
      target_conversation_id,
      actor_id,
      state_timestamp,
      state_timestamp
    )
    on conflict (organization_id, conversation_id, user_id)
    do update set
      pinned_at = excluded.pinned_at,
      updated_at = excluded.updated_at
    returning pinned_at, marked_unread_at
    into pinned_timestamp, manual_unread_timestamp;
  else
    update public.support_conversation_reads
    set pinned_at = null,
        updated_at = state_timestamp
    where organization_id = target_organization_id
      and conversation_id = target_conversation_id
      and user_id = actor_id
    returning pinned_at, marked_unread_at
    into pinned_timestamp, manual_unread_timestamp;

    if not found then
      pinned_timestamp := null;
      manual_unread_timestamp := null;
    end if;
  end if;

  return jsonb_build_object(
    'conversationId', target_conversation_id,
    'isPinned', pinned_timestamp is not null,
    'pinnedAt', pinned_timestamp,
    'markedUnreadAt', manual_unread_timestamp
  );
end;
$$;

revoke all on function private.set_support_conversation_pinned(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
grant execute on function private.set_support_conversation_pinned(uuid, uuid, boolean)
  to authenticated;

create function public.set_support_conversation_pinned(
  target_organization_id uuid,
  target_conversation_id uuid,
  should_pin boolean
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.set_support_conversation_pinned(
    target_organization_id,
    target_conversation_id,
    should_pin
  );
$$;

revoke all on function public.set_support_conversation_pinned(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_support_conversation_pinned(uuid, uuid, boolean)
  to authenticated;
