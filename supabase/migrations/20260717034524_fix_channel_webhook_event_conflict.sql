do $migration$
declare
  function_definition text;
  ambiguous_conflict_target constant text :=
    'on conflict (channel_connection_id, provider_event_id, event_type)';
  explicit_conflict_target constant text :=
    'on conflict on constraint channel_webhook_events_channel_connection_id_provider_event_id_event_type_key';
begin
  select pg_catalog.pg_get_functiondef(
    'public.ingest_channel_inbound_message(uuid,text,text,text,text,text,text,text,timestamptz,text)'::regprocedure
  )
  into function_definition;

  if pg_catalog.strpos(function_definition, ambiguous_conflict_target) = 0 then
    raise exception 'channel_webhook_conflict_target_not_found';
  end if;

  execute pg_catalog.replace(
    function_definition,
    ambiguous_conflict_target,
    explicit_conflict_target
  );
end;
$migration$;
