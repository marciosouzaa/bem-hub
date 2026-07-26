do $migration$
declare
  begin_definition text;
  retry_definition text;
  patched_definition text;
begin
  select pg_get_functiondef(
    'private.begin_support_message_send(uuid,uuid,text,uuid)'::regprocedure
  )
  into begin_definition;

  patched_definition := replace(
    begin_definition,
    'if request_id is null',
    'if $4 is null'
  );
  patched_definition := replace(
    patched_definition,
    E'    actor_id,\n    request_id,\n    jsonb_build_object',
    E'    actor_id,\n    $4,\n    jsonb_build_object'
  );
  patched_definition := replace(
    patched_definition,
    'and client_request_id = request_id;',
    'and client_request_id = $4;'
  );
  patched_definition := replace(
    patched_definition,
    'and attempt.request_id = request_id;',
    'and attempt.request_id = $4;'
  );
  patched_definition := replace(
    patched_definition,
    E'      target_message.id,\n      request_id,\n      1,',
    E'      target_message.id,\n      $4,\n      1,'
  );

  if patched_definition = begin_definition
    or position('attempt.request_id = request_id' in patched_definition) > 0
    or position('client_request_id = request_id' in patched_definition) > 0
  then
    raise exception 'support_message_send_definition_not_patched';
  end if;

  execute patched_definition;

  select pg_get_functiondef(
    'private.begin_support_message_retry(uuid,uuid,uuid)'::regprocedure
  )
  into retry_definition;

  patched_definition := replace(
    retry_definition,
    'if request_id is null',
    'if $3 is null'
  );
  patched_definition := replace(
    patched_definition,
    'and attempt.request_id = request_id;',
    'and attempt.request_id = $3;'
  );
  patched_definition := replace(
    patched_definition,
    E'    target_message_id,\n    request_id,\n    next_attempt_number,',
    E'    target_message_id,\n    $3,\n    next_attempt_number,'
  );

  if patched_definition = retry_definition
    or position('attempt.request_id = request_id' in patched_definition) > 0
  then
    raise exception 'support_message_retry_definition_not_patched';
  end if;

  execute patched_definition;
end;
$migration$;
