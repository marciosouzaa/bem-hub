alter table public.channel_credentials
  drop constraint if exists channel_credentials_provider_check;

alter table public.channel_credentials
  add constraint channel_credentials_provider_check
  check (provider in ('uazapi', 'z_api', 'evolution', 'wuzapi'));

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
  if configured_provider not in ('uazapi', 'evolution', 'wuzapi') then
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
