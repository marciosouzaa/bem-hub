create or replace function private.normalize_contact_phone(input_phone text)
returns table (
  canonical_phone text,
  match_key text,
  country_code text,
  normalization_status text,
  normalization_reason text
)
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  raw_phone text := btrim(coalesce(input_phone, ''));
  digits text;
  national_number text;
  area_code text;
  subscriber_number text;
  normalized_subscriber text;
  has_explicit_country boolean;
begin
  if raw_phone = '' then
    return query select null::text, null::text, null::text, 'invalid'::text, 'missing_phone'::text;
    return;
  end if;

  has_explicit_country := left(raw_phone, 1) = '+'
    or left(regexp_replace(raw_phone, '[^0-9]', '', 'g'), 2) = '00';
  digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');

  if left(digits, 2) = '00' then
    digits := substring(digits from 3);
  end if;

  if length(digits) < 8 or length(digits) > 15 then
    return query select
      nullif(digits, ''),
      null::text,
      null::text,
      'invalid'::text,
      'invalid_length'::text;
    return;
  end if;

  if left(digits, 2) = '55' and length(digits) in (12, 13) then
    national_number := substring(digits from 3);
  elsif not has_explicit_country and length(digits) in (10, 11) then
    national_number := digits;
    digits := '55' || digits;
  else
    return query select
      digits,
      'intl:' || digits,
      null::text,
      'unsupported_country'::text,
      'country_not_supported'::text;
    return;
  end if;

  area_code := left(national_number, 2);
  subscriber_number := substring(national_number from 3);

  if area_code !~ '^[1-9][1-9]$' then
    return query select digits, null::text, '55'::text, 'invalid'::text, 'invalid_area_code'::text;
    return;
  end if;

  if length(subscriber_number) = 8 and left(subscriber_number, 1) ~ '^[6-9]$' then
    normalized_subscriber := '9' || subscriber_number;
    normalization_reason := 'legacy_mobile_ninth_digit_added';
  elsif length(subscriber_number) = 8 and left(subscriber_number, 1) ~ '^[2-5]$' then
    normalized_subscriber := subscriber_number;
    normalization_reason := 'brazilian_landline';
  elsif length(subscriber_number) = 9 and left(subscriber_number, 1) = '9' then
    normalized_subscriber := subscriber_number;
    normalization_reason := 'brazilian_mobile';
  else
    return query select digits, null::text, '55'::text, 'invalid'::text, 'invalid_brazilian_number'::text;
    return;
  end if;

  canonical_phone := '55' || area_code || normalized_subscriber;
  match_key := 'br:' || canonical_phone;
  country_code := '55';
  normalization_status := 'supported';
  return next;
end;
$$;

revoke all on function private.normalize_contact_phone(text)
  from public, anon, authenticated;
grant execute on function private.normalize_contact_phone(text)
  to authenticated, service_role;

alter table public.contacts
  add column lifecycle_stage text not null default 'new'
    check (lifecycle_stage in ('new', 'lead', 'customer', 'discarded')),
  add column phone_match_key text,
  add column phone_country_code text,
  add column phone_normalization_status text not null default 'invalid'
    check (phone_normalization_status in ('supported', 'unsupported_country', 'invalid')),
  add column phone_normalization_reason text,
  add column archived_at timestamptz;

drop index if exists public.contacts_organization_phone_idx;

with normalized_contacts as (
  select
    contact.id,
    normalized.canonical_phone,
    normalized.match_key,
    normalized.country_code,
    normalized.normalization_status,
    normalized.normalization_reason
  from public.contacts contact
  cross join lateral private.normalize_contact_phone(contact.phone) normalized
)
update public.contacts contact
set
  phone = normalized.canonical_phone,
  phone_match_key = normalized.match_key,
  phone_country_code = normalized.country_code,
  phone_normalization_status = normalized.normalization_status,
  phone_normalization_reason = normalized.normalization_reason
from normalized_contacts normalized
where contact.id = normalized.id;

do $$
begin
  if exists (
    select 1
    from public.contacts
    where phone_match_key is not null
    group by organization_id, phone_match_key
    having count(*) > 1
  ) then
    raise exception 'existing_contact_phone_duplicates_require_review'
      using errcode = '23505';
  end if;
end;
$$;

create unique index contacts_organization_phone_match_idx
  on public.contacts(organization_id, phone_match_key)
  where phone_match_key is not null;

create index contacts_organization_stage_updated_idx
  on public.contacts(organization_id, lifecycle_stage, updated_at desc)
  where archived_at is null;

create or replace function private.apply_contact_phone_normalization()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized record;
begin
  if tg_op = 'INSERT' or new.phone is distinct from old.phone then
    select *
    into normalized
    from private.normalize_contact_phone(new.phone);

    new.phone := normalized.canonical_phone;
    new.phone_match_key := normalized.match_key;
    new.phone_country_code := normalized.country_code;
    new.phone_normalization_status := normalized.normalization_status;
    new.phone_normalization_reason := normalized.normalization_reason;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.apply_contact_phone_normalization()
  from public, anon, authenticated;
grant execute on function private.apply_contact_phone_normalization()
  to authenticated, service_role;

create trigger contacts_normalize_phone
before insert or update of phone on public.contacts
for each row execute function private.apply_contact_phone_normalization();

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
        'tags', contact.tags,
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

create or replace function public.save_contact(
  target_organization_id uuid,
  target_contact_id uuid,
  contact_name text,
  contact_phone text,
  contact_email text,
  contact_tags text[],
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
  normalized_tags text[];
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

  select coalesce(array_agg(tag order by tag), '{}'::text[])
  into normalized_tags
  from (
    select distinct left(btrim(value), 30) as tag
    from unnest(coalesce(contact_tags, '{}'::text[])) value
    where btrim(value) <> ''
    order by tag
    limit 12
  ) tags;

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
        tags = normalized_tags,
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
        tags,
        lifecycle_stage
      ) values (
        target_organization_id,
        normalized_name,
        normalized.canonical_phone,
        normalized_email,
        normalized_tags,
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
      tags = normalized_tags,
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

  return jsonb_build_object(
    'id', saved_contact_id,
    'phoneStatus', normalized.normalization_status,
    'phoneReason', normalized.normalization_reason
  );
end;
$$;

revoke all on function public.save_contact(uuid,uuid,text,text,text,text[],text)
  from public, anon, authenticated;
grant execute on function public.save_contact(uuid,uuid,text,text,text,text[],text)
  to authenticated;

create or replace function public.archive_contact(
  target_organization_id uuid,
  target_contact_id uuid
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

  update public.contacts
  set archived_at = now(), updated_at = now()
  where id = target_contact_id
    and organization_id = target_organization_id
    and archived_at is null;

  if not found then
    raise exception 'contact_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.archive_contact(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.archive_contact(uuid,uuid)
  to authenticated;

revoke delete on table public.contacts from anon, authenticated;
grant select, insert, update on table public.contacts to authenticated;

do $migration$
declare
  function_definition text;
  patched_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.ingest_channel_inbound_message(uuid,text,text,text,text,text,text,text,timestamptz,text)'::regprocedure
  )
  into function_definition;

  patched_definition := replace(
    function_definition,
    $old$  normalized_phone text;
  normalized_name text;$old$,
    $new$  normalized_phone text;
  normalized_phone_match_key text;
  normalized_name text;$new$
  );
  if patched_definition = function_definition then
    raise exception 'ingest declaration patch target not found';
  end if;
  function_definition := patched_definition;

  patched_definition := replace(
    function_definition,
    $old$  normalized_phone := nullif(regexp_replace(coalesce(sender_phone, ''), '[^0-9]', '', 'g'), '');$old$,
    $new$  select phone.canonical_phone, phone.match_key
  into normalized_phone, normalized_phone_match_key
  from private.normalize_contact_phone(sender_phone) phone;$new$
  );
  if patched_definition = function_definition then
    raise exception 'ingest phone normalization patch target not found';
  end if;
  function_definition := patched_definition;

  patched_definition := replace(
    function_definition,
    $old$  if normalized_phone is not null
    and (length(normalized_phone) < 10 or length(normalized_phone) > 15)
  then
    normalized_phone := null;
  end if;

$old$,
    ''
  );
  if patched_definition = function_definition then
    raise exception 'ingest legacy phone validation patch target not found';
  end if;
  function_definition := patched_definition;

  patched_definition := replace(
    function_definition,
    $old$      endpoint_record.organization_id::text || ':' ||
      endpoint_record.channel_connection_id::text || ':' ||
      sender_identity_type || ':' || normalized_identity,$old$,
    $new$      endpoint_record.organization_id::text || ':' ||
      coalesce(
        normalized_phone_match_key,
        endpoint_record.channel_connection_id::text || ':' ||
        sender_identity_type || ':' || normalized_identity
      ),$new$
  );
  if patched_definition = function_definition then
    raise exception 'ingest advisory lock patch target not found';
  end if;
  function_definition := patched_definition;

  patched_definition := replace(
    function_definition,
    $old$    if target_contact_id is null and normalized_phone is not null then
      select id
      into target_contact_id
      from public.contacts
      where organization_id = endpoint_record.organization_id
        and phone = normalized_phone;
    end if;$old$,
    $new$    if normalized_phone_match_key is not null then
      select id
      into target_contact_id
      from public.contacts
      where organization_id = endpoint_record.organization_id
        and phone_match_key = normalized_phone_match_key
      limit 1;
    end if;$new$
  );
  if patched_definition = function_definition then
    raise exception 'ingest contact matching patch target not found';
  end if;
  function_definition := patched_definition;

  patched_definition := replace(
    function_definition,
    $old$          phone = coalesce(phone, normalized_phone),
          updated_at = now()$old$,
    $new$          phone = coalesce(phone, normalized_phone),
          archived_at = null,
          updated_at = now()$new$
  );
  if patched_definition = function_definition then
    raise exception 'ingest contact reactivation patch target not found';
  end if;
  function_definition := patched_definition;

  patched_definition := replace(
    function_definition,
    $old$    ) do update
    set updated_at = now();$old$,
    $new$    ) do update
    set
      contact_id = excluded.contact_id,
      updated_at = now();$new$
  );
  if patched_definition = function_definition then
    raise exception 'ingest identity reassignment patch target not found';
  end if;

  execute patched_definition;
end;
$migration$;

do $migration$
declare
  function_definition text;
  patched_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.get_support_inbox(uuid)'::regprocedure
  )
  into function_definition;

  patched_definition := replace(
    function_definition,
    $old$'phone', c.phone, 'email', c.email, 'tags', c.tags$old$,
    $new$'phone', c.phone, 'email', c.email, 'tags', c.tags,
      'phoneStatus', c.phone_normalization_status,
      'phoneReason', c.phone_normalization_reason$new$
  );
  if patched_definition = function_definition then
    raise exception 'support inbox contact identity patch target not found';
  end if;
  execute patched_definition;

  select pg_catalog.pg_get_functiondef(
    'public.get_support_conversation(uuid,uuid)'::regprocedure
  )
  into function_definition;

  patched_definition := replace(
    function_definition,
    $old$'phone',c.phone,'email',c.email$old$,
    $new$'phone',c.phone,'email',c.email,
    'phoneStatus',c.phone_normalization_status,
    'phoneReason',c.phone_normalization_reason$new$
  );
  if patched_definition = function_definition then
    raise exception 'support conversation contact identity patch target not found';
  end if;
  execute patched_definition;
end;
$migration$;
