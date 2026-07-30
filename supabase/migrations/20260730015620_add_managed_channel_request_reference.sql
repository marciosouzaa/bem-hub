alter table public.channel_connections
  add column managed_request_id uuid;

update public.channel_connections connection
set managed_request_id = (
  select run.request_id
  from public.channel_provisioning_runs run
  where run.channel_connection_id = connection.id
    and run.organization_id = connection.organization_id
  order by run.created_at desc
  limit 1
)
where connection.management_mode = 'managed'
  and connection.managed_request_id is null
  and exists (
    select 1
    from public.channel_provisioning_runs run
    where run.channel_connection_id = connection.id
      and run.organization_id = connection.organization_id
  );

create unique index channel_connections_managed_request_idx
  on public.channel_connections(organization_id, managed_request_id)
  where managed_request_id is not null;

create or replace function public.register_managed_channel_provisioning(
  target_organization_id uuid,
  connection_name text,
  managed_provider text,
  provisioning_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_record record;
  new_channel_id uuid;
  new_run_id uuid;
begin
  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;
  if managed_provider not in ('evolution', 'wuzapi') then
    raise exception 'unsupported_managed_channel_provider' using errcode = '22023';
  end if;
  if provisioning_request_id is null
    or length(btrim(connection_name)) < 2
    or length(btrim(connection_name)) > 100
  then
    raise exception 'invalid_managed_channel_request' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_organization_id::text || ':' || provisioning_request_id::text,
      0
    )
  );

  select run.id as run_id, run.channel_connection_id, run.status
  into existing_record
  from public.channel_provisioning_runs run
  where run.organization_id = target_organization_id
    and run.request_id = provisioning_request_id;

  if existing_record.run_id is not null then
    return jsonb_build_object(
      'channelId', existing_record.channel_connection_id,
      'runId', existing_record.run_id,
      'runStatus', existing_record.status,
      'created', false
    );
  end if;

  insert into public.channel_connections (
    organization_id,
    kind,
    provider,
    display_name,
    phone_number,
    status,
    auth_method,
    management_mode,
    managed_request_id,
    status_reason
  ) values (
    target_organization_id,
    'unofficial',
    managed_provider,
    btrim(connection_name),
    null,
    'provisioning',
    'qr',
    'managed',
    provisioning_request_id,
    'Preparando a conexão segura.'
  )
  returning id into new_channel_id;

  insert into public.channel_provisioning_runs (
    organization_id,
    channel_connection_id,
    provider,
    request_id,
    created_by
  ) values (
    target_organization_id,
    new_channel_id,
    managed_provider,
    provisioning_request_id,
    auth.uid()
  )
  returning id into new_run_id;

  return jsonb_build_object(
    'channelId', new_channel_id,
    'runId', new_run_id,
    'runStatus', 'queued',
    'created', true
  );
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
    and public.is_org_member(target_organization_id);
$$;
