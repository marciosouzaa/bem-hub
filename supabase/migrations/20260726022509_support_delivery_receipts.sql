alter table public.support_messages
  add column delivery_status text not null default 'not_sent',
  add column delivery_updated_at timestamptz,
  add column accepted_at timestamptz,
  add column sent_at timestamptz,
  add column delivered_at timestamptz,
  add column read_at timestamptz,
  add column delivery_failed_at timestamptz;

alter table public.support_messages
  add constraint support_messages_delivery_status_check
  check (delivery_status in (
    'not_sent',
    'sending',
    'accepted',
    'sent',
    'delivered',
    'read',
    'failed'
  ));

create function private.sync_support_message_delivery_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.direction <> 'outbound' then
    return new;
  end if;

  if new.status = 'sending'
    and (
      tg_op = 'INSERT'
      or old.status is distinct from new.status
    )
  then
    new.delivery_status := 'sending';
    new.delivery_updated_at := now();
    new.delivery_failed_at := null;
  elsif new.status = 'failed'
    and new.delivery_status not in ('delivered', 'read')
  then
    new.delivery_status := 'failed';
    new.delivery_updated_at := coalesce(new.delivery_updated_at, now());
    new.delivery_failed_at := coalesce(new.delivery_failed_at, now());
  end if;

  return new;
end;
$$;

revoke all on function private.sync_support_message_delivery_status()
  from public, anon, authenticated, service_role;

create trigger support_messages_sync_delivery_status
before insert or update of status on public.support_messages
for each row execute function private.sync_support_message_delivery_status();

update public.support_messages
set delivery_status = case
      when direction <> 'outbound' then 'not_sent'
      when status = 'sending' then 'sending'
      when status = 'failed' then 'failed'
      when status = 'sent'
        and metadata ->> 'source' = 'bem_hub_app'
        then 'accepted'
      when status = 'sent' then 'sent'
      else 'not_sent'
    end,
    delivery_updated_at = case
      when direction = 'outbound'
        and status in ('sending', 'sent', 'failed')
        then coalesce(
          (metadata ->> 'deliveredAt')::timestamptz,
          (metadata ->> 'failedAt')::timestamptz,
          created_at
        )
      else null
    end,
    accepted_at = case
      when direction = 'outbound'
        and status = 'sent'
        and metadata ->> 'source' = 'bem_hub_app'
        then coalesce(
          (metadata ->> 'deliveredAt')::timestamptz,
          created_at
        )
      else null
    end,
    sent_at = case
      when direction = 'outbound'
        and status = 'sent'
        and metadata ->> 'source' is distinct from 'bem_hub_app'
        then created_at
      else null
    end,
    delivery_failed_at = case
      when direction = 'outbound' and status = 'failed'
        then coalesce(
          (metadata ->> 'failedAt')::timestamptz,
          created_at
        )
      else null
    end;

create or replace function private.finalize_support_message_send_attempt(
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
  finalized_at timestamptz := now();
begin
  if coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  ) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if $4 not in ('sent', 'failed', 'uncertain') then
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
  set status = $4,
      provider_message_id = case
        when $4 = 'sent' then nullif(btrim($5), '')
        else public.support_message_send_attempts.provider_message_id
      end,
      error_code = case
        when $4 = 'failed'
          then coalesce($6 ->> 'errorCode', 'delivery_failed')
        else null
      end,
      metadata = metadata || coalesce($6, '{}'::jsonb),
      finished_at = finalized_at
  where id = target_attempt_id
    and organization_id = target_organization_id
  returning * into target_attempt;

  update public.support_messages
  set status = case
        when $4 = 'uncertain' then 'sending'
        else $4
      end,
      external_message_id = case
        when $4 = 'sent' then nullif(btrim($5), '')
        else external_message_id
      end,
      delivery_status = case
        when $4 = 'sent' then 'accepted'
        when $4 = 'failed' then 'failed'
        else 'sending'
      end,
      delivery_updated_at = finalized_at,
      accepted_at = case
        when $4 = 'sent' then coalesce(
          ($6 ->> 'acceptedAt')::timestamptz,
          finalized_at
        )
        else accepted_at
      end,
      delivery_failed_at = case
        when $4 = 'failed' then coalesce(
          ($6 ->> 'failedAt')::timestamptz,
          finalized_at
        )
        else delivery_failed_at
      end,
      metadata = metadata || coalesce($6, '{}'::jsonb)
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

create function public.get_support_message_delivery_states(
  target_organization_id uuid,
  target_conversation_id uuid
) returns jsonb
language sql
security invoker
set search_path = ''
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'messageId', message.id,
        'status', message.delivery_status,
        'updatedAt', message.delivery_updated_at,
        'acceptedAt', message.accepted_at,
        'sentAt', message.sent_at,
        'deliveredAt', message.delivered_at,
        'readAt', message.read_at,
        'failedAt', message.delivery_failed_at
      )
      order by message.created_at, message.id
    ),
    '[]'::jsonb
  )
  from public.support_messages message
  where message.organization_id = target_organization_id
    and message.conversation_id = target_conversation_id
    and message.direction = 'outbound'
    and (select public.is_org_member(target_organization_id));
$$;

revoke all on function public.get_support_message_delivery_states(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.get_support_message_delivery_states(uuid, uuid)
  to authenticated;

create function private.ingest_support_message_delivery_update(
  target_webhook_endpoint_id uuid,
  target_provider_event_id text,
  target_provider_message_id text,
  target_delivery_status text,
  target_payload_sha256 text,
  target_provider_occurred_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint_record public.channel_webhook_endpoints%rowtype;
  event_record public.channel_webhook_events%rowtype;
  message_record public.support_messages%rowtype;
  event_timestamp timestamptz :=
    coalesce(target_provider_occurred_at, now());
  current_rank integer;
  target_rank integer;
  should_apply boolean := false;
begin
  if coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  ) <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  select endpoint.*
  into endpoint_record
  from public.channel_webhook_endpoints endpoint
  join public.channel_connections connection
    on connection.id = endpoint.channel_connection_id
    and connection.organization_id = endpoint.organization_id
    and connection.provider = endpoint.provider
  where endpoint.id = target_webhook_endpoint_id
    and endpoint.status = 'active';

  if endpoint_record.id is null then
    raise exception 'active_webhook_endpoint_not_found'
      using errcode = 'P0002';
  end if;

  if target_delivery_status not in ('sent', 'delivered', 'read', 'failed')
    or length(btrim(target_provider_event_id)) < 1
    or length(btrim(target_provider_message_id)) < 1
    or length(target_provider_message_id) > 300
    or target_payload_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_support_delivery_update'
      using errcode = '22023';
  end if;

  insert into public.channel_webhook_events (
    organization_id,
    webhook_endpoint_id,
    channel_connection_id,
    provider,
    provider_event_id,
    event_type,
    payload_sha256,
    provider_occurred_at
  ) values (
    endpoint_record.organization_id,
    endpoint_record.id,
    endpoint_record.channel_connection_id,
    endpoint_record.provider,
    btrim(target_provider_event_id),
    'message.delivery_updated',
    target_payload_sha256,
    target_provider_occurred_at
  )
  on conflict (channel_connection_id, provider_event_id, event_type)
  do update set
    attempt_count = public.channel_webhook_events.attempt_count + 1,
    last_attempt_at = now()
  returning * into event_record;

  if event_record.status = 'processed' then
    return jsonb_build_object(
      'applied', false,
      'duplicate', true,
      'eventId', event_record.id,
      'status', 'processed'
    );
  end if;

  begin
    select message.*
    into message_record
    from public.support_messages message
    where message.organization_id = endpoint_record.organization_id
      and message.channel_connection_id =
        endpoint_record.channel_connection_id
      and message.external_message_id =
        btrim(target_provider_message_id)
      and message.direction = 'outbound'
    for update;

    if message_record.id is null then
      raise exception 'support_message_for_delivery_not_found'
        using errcode = 'P0002';
    end if;

    current_rank := case message_record.delivery_status
      when 'not_sent' then 0
      when 'sending' then 1
      when 'accepted' then 2
      when 'sent' then 3
      when 'delivered' then 4
      when 'read' then 5
      when 'failed' then -1
      else 0
    end;
    target_rank := case target_delivery_status
      when 'sent' then 3
      when 'delivered' then 4
      when 'read' then 5
      when 'failed' then -1
    end;

    should_apply := case
      when target_delivery_status = 'failed'
        then message_record.delivery_status not in ('delivered', 'read')
      when message_record.delivery_status = 'failed' then true
      else target_rank > current_rank
    end;

    if should_apply then
      update public.support_messages
      set status = case
            when target_delivery_status = 'failed' then 'failed'
            else 'sent'
          end,
          delivery_status = target_delivery_status,
          delivery_updated_at = greatest(
            coalesce(delivery_updated_at, '-infinity'::timestamptz),
            event_timestamp
          ),
          sent_at = case
            when target_delivery_status in ('sent', 'delivered', 'read')
              then coalesce(sent_at, event_timestamp)
            else sent_at
          end,
          delivered_at = case
            when target_delivery_status in ('delivered', 'read')
              then coalesce(delivered_at, event_timestamp)
            else delivered_at
          end,
          read_at = case
            when target_delivery_status = 'read'
              then coalesce(read_at, event_timestamp)
            else read_at
          end,
          delivery_failed_at = case
            when target_delivery_status = 'failed'
              then coalesce(delivery_failed_at, event_timestamp)
            else delivery_failed_at
          end,
          metadata = metadata || jsonb_build_object(
            'deliveryStatus', target_delivery_status,
            'deliveryUpdatedAt', event_timestamp
          )
      where id = message_record.id
        and organization_id = message_record.organization_id;

      update public.support_message_send_attempts
      set metadata = metadata || jsonb_build_object(
            'deliveryStatus', target_delivery_status,
            'deliveryUpdatedAt', event_timestamp
          )
      where organization_id = message_record.organization_id
        and message_id = message_record.id
        and provider_message_id = btrim(target_provider_message_id);
    end if;

    update public.channel_webhook_events
    set status = 'processed',
        processed_at = now(),
        last_attempt_at = now(),
        error_code = null,
        error_message = null
    where id = event_record.id;

    return jsonb_build_object(
      'applied', should_apply,
      'conversationId', message_record.conversation_id,
      'duplicate', false,
      'eventId', event_record.id,
      'messageId', message_record.id,
      'status', 'processed'
    );
  exception when others then
    update public.channel_webhook_events
    set status = 'failed',
        last_attempt_at = now(),
        error_code = sqlstate,
        error_message = left(sqlerrm, 500)
    where id = event_record.id;

    return jsonb_build_object(
      'applied', false,
      'duplicate', false,
      'eventId', event_record.id,
      'status', 'failed'
    );
  end;
end;
$$;

revoke all on function private.ingest_support_message_delivery_update(
  uuid, text, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function private.ingest_support_message_delivery_update(
  uuid, text, text, text, text, timestamptz
) to service_role;

create function public.ingest_support_message_delivery_update(
  target_webhook_endpoint_id uuid,
  target_provider_event_id text,
  target_provider_message_id text,
  target_delivery_status text,
  target_payload_sha256 text,
  target_provider_occurred_at timestamptz
) returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.ingest_support_message_delivery_update(
    target_webhook_endpoint_id,
    target_provider_event_id,
    target_provider_message_id,
    target_delivery_status,
    target_payload_sha256,
    target_provider_occurred_at
  );
$$;

revoke all on function public.ingest_support_message_delivery_update(
  uuid, text, text, text, text, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.ingest_support_message_delivery_update(
  uuid, text, text, text, text, timestamptz
) to service_role;
