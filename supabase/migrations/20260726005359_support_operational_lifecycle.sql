alter table public.support_conversations
  add column assigned_at timestamptz,
  add column resolved_at timestamptz,
  add column resolved_by uuid references auth.users(id) on delete set null,
  add column updated_at timestamptz not null default now(),
  add column version bigint not null default 1;

update public.support_conversations
set assigned_at = coalesce(assigned_at, created_at)
where assigned_to is not null;

update public.support_conversations
set resolved_at = coalesce(resolved_at, last_message_at)
where status = 'resolved';

alter table public.support_conversations
  add constraint support_conversations_assignment_state_check
  check (
    (assigned_to is null and assigned_at is null)
    or (assigned_to is not null and assigned_at is not null)
  ),
  add constraint support_conversations_resolution_state_check
  check (
    (status = 'resolved' and resolved_at is not null)
    or (status <> 'resolved' and resolved_at is null and resolved_by is null)
  ),
  add constraint support_conversations_version_check
  check (version > 0),
  add constraint support_conversations_org_id_id_key
  unique (organization_id, id);

create index support_conversations_org_assignee_active_idx
  on public.support_conversations(
    organization_id,
    assigned_to,
    last_message_at desc
  )
  where status <> 'resolved' and assigned_to is not null;

create index support_conversations_org_resolved_at_idx
  on public.support_conversations(organization_id, resolved_at desc)
  where status = 'resolved';

create index support_conversations_resolved_by_idx
  on public.support_conversations(resolved_by)
  where resolved_by is not null;

drop policy "support_conversations_member"
  on public.support_conversations;

create policy "support_conversations_select_member"
on public.support_conversations
for select
to authenticated
using ((select public.is_org_member(organization_id)));

create policy "support_conversations_activity_update_member"
on public.support_conversations
for update
to authenticated
using ((select public.is_org_member(organization_id)))
with check ((select public.is_org_member(organization_id)));

revoke insert, update, delete on table public.support_conversations
  from authenticated;
grant select on table public.support_conversations to authenticated;
grant update (last_message_at) on table public.support_conversations
  to authenticated;

alter table public.support_messages
  add constraint support_messages_org_conversation_id_id_key
  unique (organization_id, conversation_id, id);

create table public.support_conversation_reads (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_message_id uuid,
  read_at timestamptz not null default now(),
  primary key (organization_id, conversation_id, user_id),
  constraint support_conversation_reads_conversation_fkey
    foreign key (organization_id, conversation_id)
    references public.support_conversations(organization_id, id)
    on delete cascade,
  constraint support_conversation_reads_message_fkey
    foreign key (
      organization_id,
      conversation_id,
      last_read_message_id
    )
    references public.support_messages(organization_id, conversation_id, id)
    on delete cascade
);

create index support_conversation_reads_org_user_idx
  on public.support_conversation_reads(organization_id, user_id, read_at desc);

create index support_conversation_reads_message_id_idx
  on public.support_conversation_reads(last_read_message_id)
  where last_read_message_id is not null;

alter table public.support_conversation_reads enable row level security;

create policy "support_conversation_reads_select_own"
on public.support_conversation_reads
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.is_org_member(organization_id))
);

revoke all on table public.support_conversation_reads
  from anon, authenticated;
grant select on table public.support_conversation_reads to authenticated;

create table public.support_events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'conversation.assigned',
    'conversation.status_changed',
    'conversation.priority_changed'
  )),
  previous_value text,
  next_value text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint support_events_conversation_fkey
    foreign key (organization_id, conversation_id)
    references public.support_conversations(organization_id, id)
    on delete cascade
);

create index support_events_conversation_created_idx
  on public.support_events(organization_id, conversation_id, created_at desc);

create index support_events_actor_id_idx
  on public.support_events(actor_id)
  where actor_id is not null;

alter table public.support_events enable row level security;

create policy "support_events_select_member"
on public.support_events
for select
to authenticated
using ((select public.is_org_member(organization_id)));

revoke all on table public.support_events from anon, authenticated;
grant select on table public.support_events to authenticated;

create function private.audit_support_conversation_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if old.assigned_to is distinct from new.assigned_to then
    insert into public.support_events (
      organization_id,
      conversation_id,
      actor_id,
      event_type,
      previous_value,
      next_value
    ) values (
      new.organization_id,
      new.id,
      actor_id,
      'conversation.assigned',
      old.assigned_to::text,
      new.assigned_to::text
    );
  end if;

  if old.status is distinct from new.status then
    insert into public.support_events (
      organization_id,
      conversation_id,
      actor_id,
      event_type,
      previous_value,
      next_value
    ) values (
      new.organization_id,
      new.id,
      actor_id,
      'conversation.status_changed',
      old.status,
      new.status
    );
  end if;

  if old.priority is distinct from new.priority then
    insert into public.support_events (
      organization_id,
      conversation_id,
      actor_id,
      event_type,
      previous_value,
      next_value
    ) values (
      new.organization_id,
      new.id,
      actor_id,
      'conversation.priority_changed',
      old.priority,
      new.priority
    );
  end if;

  return new;
end;
$$;

revoke all on function private.audit_support_conversation_change()
  from public, anon, authenticated, service_role;

create trigger audit_support_conversation_change
after update of assigned_to, status, priority
on public.support_conversations
for each row
when (
  old.assigned_to is distinct from new.assigned_to
  or old.status is distinct from new.status
  or old.priority is distinct from new.priority
)
execute function private.audit_support_conversation_change();

create function private.review_support_draft(
  target_organization_id uuid,
  target_message_id uuid,
  review_decision text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_conversation_id uuid;
  conversation_status text;
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

  if review_decision not in ('approved', 'rejected', 'escalated') then
    raise exception 'invalid_review_decision' using errcode = '22023';
  end if;

  update public.support_messages
  set status = case
        when review_decision = 'escalated' then 'approved'
        else review_decision
      end,
      metadata = metadata || jsonb_build_object(
        'reviewedBy', actor_id,
        'reviewedAt', now(),
        'reviewDecision', review_decision
      )
  where id = target_message_id
    and organization_id = target_organization_id
    and direction = 'outbound'
    and status = 'draft'
  returning conversation_id into target_conversation_id;

  if target_conversation_id is null then
    raise exception 'draft_not_found_or_already_reviewed'
      using errcode = 'P0002';
  end if;

  if review_decision = 'escalated' then
    select conversation.status
    into conversation_status
    from public.support_conversations conversation
    where conversation.id = target_conversation_id
      and conversation.organization_id = target_organization_id
    for update;

    if conversation_status is null then
      raise exception 'support_conversation_not_found'
        using errcode = 'P0002';
    end if;

    if conversation_status = 'resolved' then
      raise exception 'support_conversation_resolved' using errcode = '55000';
    end if;

    update public.support_conversations
    set status = 'escalated',
        priority = 'high',
        updated_at = now(),
        version = version + 1
    where id = target_conversation_id
      and organization_id = target_organization_id;
  end if;
end;
$$;

revoke all on function private.review_support_draft(uuid, uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function private.review_support_draft(uuid, uuid, text)
  to authenticated;

create or replace function public.review_support_draft(
  target_organization_id uuid,
  target_message_id uuid,
  review_decision text
) returns void
language sql
security invoker
set search_path = ''
as $$
  select private.review_support_draft(
    target_organization_id,
    target_message_id,
    review_decision
  );
$$;

revoke all on function public.review_support_draft(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.review_support_draft(uuid, uuid, text)
  to authenticated;

create function private.manage_support_conversation(
  target_organization_id uuid,
  target_conversation_id uuid,
  operation text,
  target_user_id uuid default null,
  target_priority text default null,
  expected_version bigint default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.organization_role;
  conversation_record public.support_conversations%rowtype;
  actor_is_admin boolean;
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

  actor_is_admin := actor_role in ('owner', 'admin');

  select *
  into conversation_record
  from public.support_conversations
  where id = target_conversation_id
    and organization_id = target_organization_id
  for update;

  if conversation_record.id is null then
    raise exception 'support_conversation_not_found' using errcode = 'P0002';
  end if;

  if expected_version is not null
    and expected_version <> conversation_record.version
  then
    raise exception 'support_conversation_version_conflict'
      using errcode = '40001';
  end if;

  if operation = 'take' then
    if conversation_record.status = 'resolved' then
      raise exception 'support_conversation_resolved' using errcode = '55000';
    end if;
    if conversation_record.assigned_to is not null
      and conversation_record.assigned_to <> actor_id
    then
      raise exception 'support_conversation_already_assigned'
        using errcode = '55000';
    end if;
    if conversation_record.assigned_to is null then
      update public.support_conversations
      set assigned_to = actor_id,
          assigned_at = now(),
          updated_at = now(),
          version = version + 1
      where id = target_conversation_id
        and organization_id = target_organization_id;
    end if;
  elsif operation = 'assign' then
    if target_user_id is null then
      raise exception 'support_assignee_required' using errcode = '22023';
    end if;
    if conversation_record.status = 'resolved' then
      raise exception 'support_conversation_resolved' using errcode = '55000';
    end if;
    if not actor_is_admin
      and (
        target_user_id <> actor_id
        or (
          conversation_record.assigned_to is not null
          and conversation_record.assigned_to <> actor_id
        )
      )
    then
      raise exception 'support_assignment_not_allowed' using errcode = '42501';
    end if;
    if not exists (
      select 1
      from public.organization_members member
      where member.organization_id = target_organization_id
        and member.user_id = target_user_id
        and member.status = 'active'
    ) then
      raise exception 'support_assignee_not_found' using errcode = 'P0002';
    end if;
    if conversation_record.assigned_to is distinct from target_user_id then
      update public.support_conversations
      set assigned_to = target_user_id,
          assigned_at = now(),
          updated_at = now(),
          version = version + 1
      where id = target_conversation_id
        and organization_id = target_organization_id;
    end if;
  elsif operation = 'release' then
    if conversation_record.assigned_to is not null
      and conversation_record.assigned_to <> actor_id
      and not actor_is_admin
    then
      raise exception 'support_assignment_not_allowed' using errcode = '42501';
    end if;
    if conversation_record.assigned_to is not null then
      update public.support_conversations
      set assigned_to = null,
          assigned_at = null,
          updated_at = now(),
          version = version + 1
      where id = target_conversation_id
        and organization_id = target_organization_id;
    end if;
  elsif operation = 'reopen' then
    if conversation_record.status <> 'resolved' then
      raise exception 'support_conversation_not_resolved' using errcode = '55000';
    end if;
    if conversation_record.assigned_to is not null
      and conversation_record.assigned_to <> actor_id
      and not actor_is_admin
    then
      raise exception 'support_conversation_owned_by_another_member'
        using errcode = '42501';
    end if;
    update public.support_conversations
    set assigned_to = coalesce(assigned_to, actor_id),
        assigned_at = coalesce(assigned_at, now()),
        status = 'open',
        resolved_at = null,
        resolved_by = null,
        updated_at = now(),
        version = version + 1
    where id = target_conversation_id
      and organization_id = target_organization_id;
  elsif operation in ('open', 'pending', 'escalate', 'resolve') then
    if conversation_record.status = 'resolved' then
      raise exception 'support_conversation_resolved' using errcode = '55000';
    end if;
    if conversation_record.assigned_to is distinct from actor_id
      and not actor_is_admin
    then
      if conversation_record.assigned_to is null then
        raise exception 'support_assignment_required' using errcode = '55000';
      end if;
      raise exception 'support_conversation_owned_by_another_member'
        using errcode = '42501';
    end if;

    if operation = 'resolve' and conversation_record.status <> 'resolved' then
      update public.support_conversations
      set status = 'resolved',
          resolved_at = now(),
          resolved_by = actor_id,
          updated_at = now(),
          version = version + 1
      where id = target_conversation_id
        and organization_id = target_organization_id;
    elsif operation = 'escalate'
      and conversation_record.status <> 'escalated'
    then
      update public.support_conversations
      set status = 'escalated',
          priority = case
            when priority in ('low', 'normal') then 'high'
            else priority
          end,
          updated_at = now(),
          version = version + 1
      where id = target_conversation_id
        and organization_id = target_organization_id;
    elsif operation in ('open', 'pending')
      and conversation_record.status <> operation
    then
      update public.support_conversations
      set status = operation,
          updated_at = now(),
          version = version + 1
      where id = target_conversation_id
        and organization_id = target_organization_id;
    end if;
  elsif operation = 'set_priority' then
    if target_priority not in ('low', 'normal', 'high', 'urgent') then
      raise exception 'invalid_support_priority' using errcode = '22023';
    end if;
    if conversation_record.status = 'resolved' then
      raise exception 'support_conversation_resolved' using errcode = '55000';
    end if;
    if conversation_record.assigned_to is distinct from actor_id
      and not actor_is_admin
    then
      if conversation_record.assigned_to is null then
        raise exception 'support_assignment_required' using errcode = '55000';
      end if;
      raise exception 'support_conversation_owned_by_another_member'
        using errcode = '42501';
    end if;
    if conversation_record.priority <> target_priority then
      update public.support_conversations
      set priority = target_priority,
          updated_at = now(),
          version = version + 1
      where id = target_conversation_id
        and organization_id = target_organization_id;
    end if;
  else
    raise exception 'invalid_support_operation' using errcode = '22023';
  end if;

  select *
  into conversation_record
  from public.support_conversations
  where id = target_conversation_id
    and organization_id = target_organization_id;

  return jsonb_build_object(
    'id', conversation_record.id,
    'assignedTo', conversation_record.assigned_to,
    'assignedAt', conversation_record.assigned_at,
    'status', conversation_record.status,
    'priority', conversation_record.priority,
    'resolvedAt', conversation_record.resolved_at,
    'resolvedBy', conversation_record.resolved_by,
    'version', conversation_record.version
  );
end;
$$;

revoke all on function private.manage_support_conversation(
  uuid, uuid, text, uuid, text, bigint
) from public, anon, authenticated, service_role;
grant execute on function private.manage_support_conversation(
  uuid, uuid, text, uuid, text, bigint
) to authenticated;

create function public.manage_support_conversation(
  target_organization_id uuid,
  target_conversation_id uuid,
  operation text,
  target_user_id uuid default null,
  target_priority text default null,
  expected_version bigint default null
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.manage_support_conversation(
    target_organization_id,
    target_conversation_id,
    operation,
    target_user_id,
    target_priority,
    expected_version
  );
$$;

revoke all on function public.manage_support_conversation(
  uuid, uuid, text, uuid, text, bigint
) from public, anon, authenticated;
grant execute on function public.manage_support_conversation(
  uuid, uuid, text, uuid, text, bigint
) to authenticated;

create function private.mark_support_conversation_read(
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
    read_at
  ) values (
    target_organization_id,
    target_conversation_id,
    actor_id,
    latest_message_id,
    read_timestamp
  )
  on conflict (organization_id, conversation_id, user_id)
  do update set
    last_read_message_id = excluded.last_read_message_id,
    read_at = excluded.read_at;

  return jsonb_build_object(
    'conversationId', target_conversation_id,
    'lastReadMessageId', latest_message_id,
    'readAt', read_timestamp
  );
end;
$$;

revoke all on function private.mark_support_conversation_read(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.mark_support_conversation_read(uuid, uuid)
  to authenticated;

create function public.mark_support_conversation_read(
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

create function public.get_support_inbox_operational(
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
          'phoneNumber', channel.phone_number
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

create function public.get_support_conversation_state(
  target_organization_id uuid,
  target_conversation_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'assignedTo', conversation.assigned_to,
    'assignedAt', conversation.assigned_at,
    'assignee', case
      when assignee.id is null then null
      else jsonb_build_object(
        'id', assignee.id,
        'name', assignee.name,
        'email', assignee.email
      )
    end,
    'resolvedAt', conversation.resolved_at,
    'resolvedBy', conversation.resolved_by,
    'updatedAt', conversation.updated_at,
    'version', conversation.version
  )
  from public.support_conversations conversation
  left join public.profiles assignee
    on assignee.id = conversation.assigned_to
  where conversation.id = target_conversation_id
    and conversation.organization_id = target_organization_id
    and (select public.is_org_member(target_organization_id));
$$;

revoke all on function public.get_support_conversation_state(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_support_conversation_state(uuid, uuid)
  to authenticated;

create function public.get_support_conversation_events(
  target_organization_id uuid,
  target_conversation_id uuid,
  event_limit integer default 40
) returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', event.id,
        'type', event.event_type,
        'actorId', event.actor_id,
        'actorName', actor.name,
        'previousValue', event.previous_value,
        'nextValue', event.next_value,
        'createdAt', event.created_at
      )
      order by event.created_at desc, event.id desc
    ),
    '[]'::jsonb
  )
  from (
    select support_event.*
    from public.support_events support_event
    where support_event.organization_id = target_organization_id
      and support_event.conversation_id = target_conversation_id
      and (select public.is_org_member(target_organization_id))
    order by support_event.created_at desc, support_event.id desc
    limit least(greatest(coalesce(event_limit, 40), 1), 100)
  ) event
  left join public.profiles actor
    on actor.id = event.actor_id;
$$;

revoke all on function public.get_support_conversation_events(
  uuid, uuid, integer
) from public, anon, authenticated;
grant execute on function public.get_support_conversation_events(
  uuid, uuid, integer
) to authenticated;

create function public.get_support_operational_metrics(
  target_organization_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'open', count(*) filter (where conversation.status = 'open'),
    'pending', count(*) filter (where conversation.status = 'pending'),
    'escalated', count(*) filter (where conversation.status = 'escalated'),
    'resolved', count(*) filter (where conversation.status = 'resolved'),
    'unassigned', count(*) filter (
      where conversation.status <> 'resolved'
        and conversation.assigned_to is null
    ),
    'resolvedLast7Days', count(*) filter (
      where conversation.status = 'resolved'
        and conversation.resolved_at >= now() - interval '7 days'
    ),
    'averageResolutionMinutes', round(
      avg(
        extract(epoch from (
          conversation.resolved_at - conversation.created_at
        )) / 60
      ) filter (
        where conversation.status = 'resolved'
          and conversation.resolved_at is not null
      ),
      1
    )
  )
  from public.support_conversations conversation
  where conversation.organization_id = target_organization_id
    and (select public.is_org_member(target_organization_id));
$$;

revoke all on function public.get_support_operational_metrics(uuid)
  from public, anon, authenticated;
grant execute on function public.get_support_operational_metrics(uuid)
  to authenticated;
