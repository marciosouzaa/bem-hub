alter table public.channel_connections
  alter column phone_number drop not null,
  add column management_mode text not null default 'legacy',
  add column provisioned_at timestamptz,
  add column deprovisioned_at timestamptz,
  add constraint channel_connections_management_mode_check
    check (management_mode in ('legacy', 'managed', 'external'));

create table public.channel_provisioning_runs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  channel_connection_id uuid not null
    references public.channel_connections(id) on delete cascade,
  provider text not null
    check (provider in ('evolution', 'wuzapi')),
  operation text not null default 'create'
    check (operation in ('create', 'reconcile', 'rotate', 'deprovision')),
  request_id uuid not null,
  status text not null default 'queued'
    check (status in (
      'queued', 'in_progress', 'awaiting_pairing', 'succeeded', 'failed'
    )),
  step text not null default 'requested'
    check (length(step) between 2 and 80),
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  error_code text,
  error_message text,
  lease_expires_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, request_id)
);

create index channel_provisioning_runs_organization_created_idx
  on public.channel_provisioning_runs(organization_id, created_at desc);

create index channel_provisioning_runs_channel_created_idx
  on public.channel_provisioning_runs(channel_connection_id, created_at desc);

create unique index channel_provisioning_runs_active_channel_idx
  on public.channel_provisioning_runs(channel_connection_id)
  where status in ('queued', 'in_progress', 'awaiting_pairing');

alter table public.channel_provisioning_runs enable row level security;

revoke all on table public.channel_provisioning_runs
  from public, anon, authenticated;
grant all on table public.channel_provisioning_runs to service_role;

create policy "channel_provisioning_runs_service_only"
  on public.channel_provisioning_runs
  for all to service_role
  using (true)
  with check (true);

create function public.register_managed_channel_provisioning(
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

revoke all on function public.register_managed_channel_provisioning(
  uuid, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.register_managed_channel_provisioning(
  uuid, text, text, uuid
) to authenticated;

create function public.claim_managed_channel_provisioning(
  target_organization_id uuid,
  target_run_id uuid
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  claimed boolean;
begin
  update public.channel_provisioning_runs
  set status = 'in_progress',
      step = 'persisting_credentials',
      attempt_count = attempt_count + 1,
      error_code = null,
      error_message = null,
      lease_expires_at = now() + interval '2 minutes',
      started_at = coalesce(started_at, now()),
      finished_at = null,
      updated_at = now()
  where id = target_run_id
    and organization_id = target_organization_id
    and (
      status in ('queued', 'failed')
      or (
        status = 'in_progress'
        and lease_expires_at < now()
      )
    );

  claimed := found;
  return claimed;
end;
$$;

revoke all on function public.claim_managed_channel_provisioning(
  uuid, uuid
) from public, anon, authenticated;
grant execute on function public.claim_managed_channel_provisioning(
  uuid, uuid
) to service_role;

create or replace function public.update_channel_provider_health(
  target_organization_id uuid,
  target_connection_id uuid,
  provider_status text,
  provider_status_reason text,
  configured_external_instance_id text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if provider_status not in (
    'draft', 'provisioning', 'awaiting_pairing', 'connecting',
    'connected', 'degraded', 'disconnected', 'failed', 'disabled'
  ) then
    raise exception 'invalid_channel_status' using errcode = '22023';
  end if;

  update public.channel_connections
  set status = provider_status,
      status_reason = nullif(provider_status_reason, ''),
      external_instance_id = coalesce(
        nullif(configured_external_instance_id, ''),
        external_instance_id
      ),
      last_health_at = now(),
      last_connected_at = case
        when provider_status = 'connected' then coalesce(last_connected_at, now())
        else last_connected_at
      end,
      provisioned_at = case
        when provider_status = 'connected' and management_mode = 'managed'
          then coalesce(provisioned_at, now())
        else provisioned_at
      end
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
      when management_mode = 'managed' then (
        select run.request_id
        from public.channel_provisioning_runs run
        where run.channel_connection_id = channel_connections.id
          and run.organization_id = channel_connections.organization_id
        order by run.created_at desc
        limit 1
      )
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
