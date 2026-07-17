do $migration$
declare
  function_definition text;
  oversized_constraint_name constant text :=
    'channel_webhook_events_channel_connection_id_provider_event_id_event_type_key';
  actual_constraint_name constant text :=
    'channel_webhook_events_channel_connection_id_provider_event_key';
begin
  select pg_catalog.pg_get_functiondef(
    'public.ingest_channel_inbound_message(uuid,text,text,text,text,text,text,text,timestamptz,text)'::regprocedure
  )
  into function_definition;

  if pg_catalog.strpos(function_definition, oversized_constraint_name) = 0 then
    raise exception 'channel_webhook_oversized_constraint_name_not_found';
  end if;

  execute pg_catalog.replace(
    function_definition,
    oversized_constraint_name,
    actual_constraint_name
  );
end;
$migration$;
