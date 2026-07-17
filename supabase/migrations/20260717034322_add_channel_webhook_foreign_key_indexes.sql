create index channel_credentials_created_by_idx
  on public.channel_credentials(created_by);

create index channel_webhook_endpoints_created_by_idx
  on public.channel_webhook_endpoints(created_by);

create index channel_webhook_events_webhook_endpoint_id_idx
  on public.channel_webhook_events(webhook_endpoint_id);

create index support_messages_channel_connection_id_idx
  on public.support_messages(channel_connection_id);
