create table public.tags (
  id uuid not null default extensions.uuid_generate_v4(),
  organization_id uuid not null,
  name text not null,
  hex_color text not null default '#4EE3A3',
  description text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint tags_pkey primary key (id),
  constraint tags_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id)
    on delete cascade,
  constraint tags_created_by_fkey
    foreign key (created_by)
    references auth.users(id)
    on delete set null,
  constraint tags_organization_id_id_key unique (organization_id, id),
  constraint tags_name_not_blank_check check (btrim(name) <> ''),
  constraint tags_name_length_check check (char_length(name) <= 60),
  constraint tags_hex_color_check check (hex_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint tags_description_length_check
    check (description is null or char_length(description) <= 500)
);

create unique index tags_organization_normalized_name_idx
  on public.tags(organization_id, lower(name));

create index tags_created_by_idx
  on public.tags(created_by)
  where created_by is not null;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.contacts'::regclass
      and conname = 'contacts_organization_id_id_key'
  ) then
    alter table public.contacts
      add constraint contacts_organization_id_id_key
      unique (organization_id, id);
  end if;
end;
$$;

create table public.contact_tag_assignments (
  organization_id uuid not null,
  contact_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  constraint contact_tag_assignments_pkey
    primary key (organization_id, contact_id, tag_id),
  constraint contact_tag_assignments_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id)
    on delete cascade,
  constraint contact_tag_assignments_contact_fkey
    foreign key (organization_id, contact_id)
    references public.contacts(organization_id, id)
    on delete cascade,
  constraint contact_tag_assignments_tag_fkey
    foreign key (organization_id, tag_id)
    references public.tags(organization_id, id)
    on delete cascade
);

create index contact_tag_assignments_org_tag_idx
  on public.contact_tag_assignments(organization_id, tag_id, contact_id);

alter table public.tags enable row level security;
alter table public.contact_tag_assignments enable row level security;

create policy "tags_select_member"
on public.tags
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "tags_insert_member"
on public.tags
for insert
to authenticated
with check (public.is_org_member(organization_id));

create policy "tags_update_member"
on public.tags
for update
to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create policy "contact_tag_assignments_select_member"
on public.contact_tag_assignments
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "contact_tag_assignments_insert_member"
on public.contact_tag_assignments
for insert
to authenticated
with check (public.is_org_member(organization_id));

create policy "contact_tag_assignments_delete_member"
on public.contact_tag_assignments
for delete
to authenticated
using (public.is_org_member(organization_id));

revoke all on table public.tags
  from anon, authenticated;
revoke all on table public.contact_tag_assignments
  from anon, authenticated;

grant select, insert, update on table public.tags
  to authenticated;
grant select, insert, delete on table public.contact_tag_assignments
  to authenticated;
grant all on table public.tags
  to service_role;
grant all on table public.contact_tag_assignments
  to service_role;

insert into public.tags (
  organization_id,
  name,
  hex_color
)
select
  expanded.organization_id,
  min(expanded.name),
  '#4EE3A3'
from (
  select
    contact.organization_id,
    btrim(tag_name) as name
  from public.contacts contact
  cross join lateral unnest(contact.tags) tag_name
  where btrim(tag_name) <> ''
) expanded
group by expanded.organization_id, lower(expanded.name);

insert into public.contact_tag_assignments (
  organization_id,
  contact_id,
  tag_id
)
select distinct
  contact.organization_id,
  contact.id,
  tag.id
from public.contacts contact
cross join lateral unnest(contact.tags) tag_name
join public.tags tag
  on tag.organization_id = contact.organization_id
  and lower(tag.name) = lower(btrim(tag_name))
where btrim(tag_name) <> '';

do $$
declare
  expected_assignments bigint;
  migrated_assignments bigint;
begin
  select count(*)
  into expected_assignments
  from (
    select distinct
      contact.organization_id,
      contact.id,
      lower(btrim(tag_name))
    from public.contacts contact
    cross join lateral unnest(contact.tags) tag_name
    where btrim(tag_name) <> ''
  ) expected;

  select count(*)
  into migrated_assignments
  from public.contact_tag_assignments;

  if expected_assignments <> migrated_assignments then
    raise exception 'contact_tag_backfill_incomplete'
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.list_tags(target_organization_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', tag.id,
        'name', tag.name,
        'hexColor', upper(tag.hex_color),
        'description', tag.description,
        'usageCount', coalesce(usage.usage_count, 0),
        'updatedAt', tag.updated_at
      )
      order by lower(tag.name), tag.id
    ),
    '[]'::jsonb
  )
  from public.tags tag
  left join lateral (
    select count(*) as usage_count
    from public.contact_tag_assignments assignment
    where assignment.organization_id = tag.organization_id
      and assignment.tag_id = tag.id
  ) usage on true
  where tag.organization_id = target_organization_id
    and tag.archived_at is null
    and public.is_org_member(target_organization_id);
$$;

revoke all on function public.list_tags(uuid)
  from public, anon, authenticated;
grant execute on function public.list_tags(uuid)
  to authenticated;

create or replace function public.save_tag(
  target_organization_id uuid,
  target_tag_id uuid,
  tag_name text,
  tag_hex_color text,
  tag_description text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_name text := nullif(left(btrim(coalesce(tag_name, '')), 60), '');
  normalized_color text := upper(btrim(coalesce(tag_hex_color, '')));
  normalized_description text :=
    nullif(left(btrim(coalesce(tag_description, '')), 500), '');
  existing_tag_id uuid;
  existing_archived_at timestamptz;
  saved_tag_id uuid;
begin
  if not public.is_org_member(target_organization_id) then
    raise exception 'organization_member_required' using errcode = '42501';
  end if;

  if normalized_name is null then
    raise exception 'tag_name_required' using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(tag_name, ''))) > 60 then
    raise exception 'tag_name_too_long' using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(tag_description, ''))) > 500 then
    raise exception 'tag_description_too_long' using errcode = '22023';
  end if;

  if normalized_color !~ '^#[0-9A-F]{6}$' then
    raise exception 'invalid_tag_color' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_organization_id::text || ':tag:' || lower(normalized_name),
      0
    )
  );

  select tag.id, tag.archived_at
  into existing_tag_id, existing_archived_at
  from public.tags tag
  where tag.organization_id = target_organization_id
    and lower(tag.name) = lower(normalized_name)
  limit 1;

  if target_tag_id is null then
    if existing_tag_id is not null and existing_archived_at is null then
      raise exception 'tag_name_exists' using errcode = '23505';
    end if;

    if existing_tag_id is not null then
      update public.tags
      set
        name = normalized_name,
        hex_color = normalized_color,
        description = normalized_description,
        archived_at = null,
        updated_at = now()
      where id = existing_tag_id
        and organization_id = target_organization_id
      returning id into saved_tag_id;
    else
      insert into public.tags (
        organization_id,
        name,
        hex_color,
        description,
        created_by
      ) values (
        target_organization_id,
        normalized_name,
        normalized_color,
        normalized_description,
        (select auth.uid())
      )
      returning id into saved_tag_id;
    end if;
  else
    if existing_tag_id is not null and existing_tag_id <> target_tag_id then
      raise exception 'tag_name_exists' using errcode = '23505';
    end if;

    update public.tags
    set
      name = normalized_name,
      hex_color = normalized_color,
      description = normalized_description,
      updated_at = now()
    where id = target_tag_id
      and organization_id = target_organization_id
      and archived_at is null
    returning id into saved_tag_id;

    if saved_tag_id is null then
      raise exception 'tag_not_found' using errcode = 'P0002';
    end if;
  end if;

  return jsonb_build_object('id', saved_tag_id);
end;
$$;

revoke all on function public.save_tag(uuid,uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.save_tag(uuid,uuid,text,text,text)
  to authenticated;

create or replace function public.archive_tag(
  target_organization_id uuid,
  target_tag_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_org_member(target_organization_id) then
    raise exception 'organization_member_required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.contact_tag_assignments assignment
    where assignment.organization_id = target_organization_id
      and assignment.tag_id = target_tag_id
  ) then
    raise exception 'tag_in_use' using errcode = '23503';
  end if;

  update public.tags
  set archived_at = now(), updated_at = now()
  where id = target_tag_id
    and organization_id = target_organization_id
    and archived_at is null;

  if not found then
    raise exception 'tag_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.archive_tag(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.archive_tag(uuid,uuid)
  to authenticated;

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

create or replace function public.get_support_inbox(target_organization_id uuid)
returns jsonb
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
  where conversation.organization_id = target_organization_id
    and public.is_org_member(target_organization_id);
$$;

revoke all on function public.save_contact(uuid,uuid,text,text,text,text[],text)
  from public, anon, authenticated;
drop function public.save_contact(uuid,uuid,text,text,text,text[],text);

alter table public.contacts drop column tags;

create function public.save_contact(
  target_organization_id uuid,
  target_contact_id uuid,
  contact_name text,
  contact_phone text,
  contact_email text,
  contact_tag_ids uuid[],
  contact_lifecycle_stage text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized record;
  normalized_name text := nullif(left(btrim(coalesce(contact_name, '')), 200), '');
  normalized_email text := nullif(lower(left(btrim(coalesce(contact_email, '')), 320)), '');
  normalized_tag_ids uuid[];
  saved_contact_id uuid;
  existing_contact_id uuid;
  existing_archived_at timestamptz;
begin
  if not public.is_org_member(target_organization_id) then
    raise exception 'organization_member_required' using errcode = '42501';
  end if;

  if contact_lifecycle_stage not in ('new', 'lead', 'customer', 'discarded') then
    raise exception 'invalid_contact_stage' using errcode = '22023';
  end if;

  if normalized_email is not null
    and normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  then
    raise exception 'invalid_contact_email' using errcode = '22023';
  end if;

  select coalesce(array_agg(tag_id order by tag_id), '{}'::uuid[])
  into normalized_tag_ids
  from (
    select distinct value as tag_id
    from unnest(coalesce(contact_tag_ids, '{}'::uuid[])) value
    limit 13
  ) tag_ids;

  if cardinality(normalized_tag_ids) > 12 then
    raise exception 'too_many_contact_tags' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(normalized_tag_ids) requested_tag_id
    where not exists (
      select 1
      from public.tags tag
      where tag.id = requested_tag_id
        and tag.organization_id = target_organization_id
        and tag.archived_at is null
    )
  ) then
    raise exception 'invalid_contact_tag' using errcode = '22023';
  end if;

  select *
  into normalized
  from private.normalize_contact_phone(contact_phone);

  if nullif(btrim(coalesce(contact_phone, '')), '') is not null
    and normalized.normalization_status = 'invalid'
  then
    raise exception 'invalid_contact_phone' using errcode = '22023';
  end if;

  if normalized_name is null
    and normalized.canonical_phone is null
    and normalized_email is null
  then
    raise exception 'empty_contact' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_organization_id::text || ':' ||
      coalesce(normalized.match_key, normalized_email, target_contact_id::text, 'new-contact'),
      0
    )
  );

  if normalized.match_key is not null then
    select id, archived_at
    into existing_contact_id, existing_archived_at
    from public.contacts
    where organization_id = target_organization_id
      and phone_match_key = normalized.match_key
    limit 1;
  end if;

  if target_contact_id is null then
    if existing_contact_id is not null and existing_archived_at is null then
      raise exception 'contact_phone_exists' using errcode = '23505';
    end if;

    if existing_contact_id is not null then
      update public.contacts
      set
        name = normalized_name,
        phone = normalized.canonical_phone,
        email = normalized_email,
        lifecycle_stage = contact_lifecycle_stage,
        archived_at = null,
        updated_at = now()
      where id = existing_contact_id
        and organization_id = target_organization_id
      returning id into saved_contact_id;
    else
      insert into public.contacts (
        organization_id,
        name,
        phone,
        email,
        lifecycle_stage
      ) values (
        target_organization_id,
        normalized_name,
        normalized.canonical_phone,
        normalized_email,
        contact_lifecycle_stage
      )
      returning id into saved_contact_id;
    end if;
  else
    if existing_contact_id is not null and existing_contact_id <> target_contact_id then
      raise exception 'contact_phone_exists' using errcode = '23505';
    end if;

    update public.contacts
    set
      name = normalized_name,
      phone = normalized.canonical_phone,
      email = normalized_email,
      lifecycle_stage = contact_lifecycle_stage,
      updated_at = now()
    where id = target_contact_id
      and organization_id = target_organization_id
      and archived_at is null
    returning id into saved_contact_id;

    if saved_contact_id is null then
      raise exception 'contact_not_found' using errcode = 'P0002';
    end if;
  end if;

  delete from public.contact_tag_assignments
  where organization_id = target_organization_id
    and contact_id = saved_contact_id;

  insert into public.contact_tag_assignments (
    organization_id,
    contact_id,
    tag_id
  )
  select
    target_organization_id,
    saved_contact_id,
    tag_id
  from unnest(normalized_tag_ids) tag_id;

  return jsonb_build_object(
    'id', saved_contact_id,
    'phoneStatus', normalized.normalization_status,
    'phoneReason', normalized.normalization_reason
  );
end;
$$;

revoke all on function public.save_contact(uuid,uuid,text,text,text,uuid[],text)
  from public, anon, authenticated;
grant execute on function public.save_contact(uuid,uuid,text,text,text,uuid[],text)
  to authenticated;

revoke delete on table public.tags from anon, authenticated;

notify pgrst, 'reload schema';
