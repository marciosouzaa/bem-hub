alter table public.channel_connections
  drop constraint if exists channel_connections_status_check;

update public.channel_connections
set status = case status
  when 'active' then 'connected'
  when 'pending' then 'draft'
  else status
end;

alter table public.channel_connections
  add column if not exists external_instance_id text,
  add column if not exists provider_base_url text,
  add column if not exists status_reason text,
  add column if not exists last_health_at timestamptz,
  add column if not exists last_connected_at timestamptz,
  add column if not exists credential_updated_at timestamptz,
  add column if not exists webhook_verified_at timestamptz;

alter table public.channel_connections
  alter column status set default 'draft',
  add constraint channel_connections_status_check
  check (status in (
    'draft', 'provisioning', 'awaiting_pairing', 'connecting',
    'connected', 'degraded', 'disconnected', 'failed', 'disabled'
  ));

create or replace function public.register_channel_connection(
  target_organization_id uuid,
  connection_kind text,
  connection_name text,
  connection_phone text,
  connection_auth_method text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
  normalized_phone text;
begin
  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;
  if connection_kind not in ('official', 'unofficial')
    or connection_auth_method not in ('qr', 'pin') then
    raise exception 'invalid_channel_configuration' using errcode = '22023';
  end if;

  normalized_phone := regexp_replace(connection_phone, '[^0-9+]', '', 'g');
  if length(normalized_phone) < 10
    or length(normalized_phone) > 20
    or length(btrim(connection_name)) < 2 then
    raise exception 'invalid_channel_connection' using errcode = '22023';
  end if;

  insert into public.channel_connections (
    organization_id,
    kind,
    provider,
    display_name,
    phone_number,
    status,
    auth_method
  ) values (
    target_organization_id,
    connection_kind,
    'pending-selection',
    btrim(connection_name),
    normalized_phone,
    'draft',
    connection_auth_method
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.register_channel_connection(
  uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.register_channel_connection(
  uuid, text, text, text, text
) to authenticated;

create unique index if not exists channel_connections_provider_instance_idx
  on public.channel_connections(organization_id, provider, external_instance_id)
  where external_instance_id is not null;

create table public.channel_credentials (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_connection_id uuid not null references public.channel_connections(id) on delete cascade,
  provider text not null check (provider in ('uazapi', 'z_api')),
  encrypted_credentials text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_connection_id)
);

create index channel_credentials_organization_id_idx
  on public.channel_credentials(organization_id);

alter table public.channel_credentials enable row level security;

revoke all on table public.channel_credentials from public, anon, authenticated;
grant all on table public.channel_credentials to service_role;

create or replace function public.save_channel_provider_configuration(
  target_organization_id uuid,
  target_connection_id uuid,
  configured_provider text,
  configured_base_url text,
  configured_external_instance_id text,
  encrypted_provider_credentials text,
  actor_user_id uuid,
  provider_status text,
  provider_status_reason text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if configured_provider not in ('uazapi', 'z_api') then
    raise exception 'unsupported_channel_provider' using errcode = '22023';
  end if;

  if provider_status not in (
    'draft', 'provisioning', 'awaiting_pairing', 'connecting',
    'connected', 'degraded', 'disconnected', 'failed', 'disabled'
  ) then
    raise exception 'invalid_channel_status' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.channel_connections
    where id = target_connection_id
      and organization_id = target_organization_id
      and kind = 'unofficial'
  ) then
    raise exception 'channel_not_found' using errcode = 'P0002';
  end if;

  insert into public.channel_credentials (
    organization_id,
    channel_connection_id,
    provider,
    encrypted_credentials,
    created_by
  ) values (
    target_organization_id,
    target_connection_id,
    configured_provider,
    encrypted_provider_credentials,
    actor_user_id
  )
  on conflict (channel_connection_id) do update
  set provider = excluded.provider,
      encrypted_credentials = excluded.encrypted_credentials,
      updated_at = now();

  update public.channel_connections
  set provider = configured_provider,
      provider_base_url = nullif(configured_base_url, ''),
      external_instance_id = nullif(configured_external_instance_id, ''),
      status = provider_status,
      status_reason = nullif(provider_status_reason, ''),
      last_health_at = now(),
      last_connected_at = case
        when provider_status = 'connected' then coalesce(last_connected_at, now())
        else last_connected_at
      end,
      credential_updated_at = now()
  where id = target_connection_id
    and organization_id = target_organization_id;
end;
$$;

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
      end
  where id = target_connection_id
    and organization_id = target_organization_id;

  if not found then
    raise exception 'channel_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.save_channel_provider_configuration(
  uuid, uuid, text, text, text, text, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.update_channel_provider_health(
  uuid, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.save_channel_provider_configuration(
  uuid, uuid, text, text, text, text, uuid, text, text
) to service_role;
grant execute on function public.update_channel_provider_health(
  uuid, uuid, text, text, text
) to service_role;

create or replace function public.list_channel_connections(target_organization_id uuid)
returns jsonb
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
    'externalInstanceId', external_instance_id,
    'providerBaseUrl', provider_base_url,
    'statusReason', status_reason,
    'lastHealthAt', last_health_at,
    'lastConnectedAt', last_connected_at,
    'credentialUpdatedAt', credential_updated_at,
    'hasCredentials', credential_updated_at is not null
  ) order by created_at), '[]'::jsonb)
  from public.channel_connections
  where organization_id = target_organization_id
    and public.is_org_member(target_organization_id);
$$;
