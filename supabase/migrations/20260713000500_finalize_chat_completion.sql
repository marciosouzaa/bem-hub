create or replace function public.finalize_chat_completion(
  target_organization_id uuid,
  target_conversation_id uuid,
  message_content text,
  model_name text,
  input_tokens integer,
  output_tokens integer,
  message_metadata jsonb,
  usage_metadata jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_message_id uuid;
begin
  if (select auth.uid()) is null
    or not public.is_org_member(target_organization_id) then
    raise exception 'organization_member_required' using errcode = '42501';
  end if;

  if message_content is null or btrim(message_content) = '' then
    raise exception 'message_content_required' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.conversations c
    where c.id = target_conversation_id
      and c.organization_id = target_organization_id
      and (
        c.user_id = (select auth.uid())
        or public.is_org_admin(target_organization_id)
      )
  ) then
    raise exception 'conversation_access_denied' using errcode = '42501';
  end if;

  insert into public.messages (
    organization_id,
    conversation_id,
    role,
    content,
    model,
    tokens_input,
    tokens_output,
    metadata
  )
  values (
    target_organization_id,
    target_conversation_id,
    'assistant',
    message_content,
    model_name,
    input_tokens,
    output_tokens,
    coalesce(message_metadata, '{}'::jsonb)
  )
  returning id into new_message_id;

  update public.conversations
  set updated_at = clock_timestamp()
  where id = target_conversation_id
    and organization_id = target_organization_id;

  if not found then
    raise exception 'conversation_update_failed' using errcode = 'P0002';
  end if;

  insert into public.usage_events (
    organization_id,
    user_id,
    event_type,
    model,
    tokens_input,
    tokens_output,
    metadata
  )
  values (
    target_organization_id,
    (select auth.uid()),
    'chat.completion',
    model_name,
    input_tokens,
    output_tokens,
    coalesce(usage_metadata, '{}'::jsonb)
  );

  return new_message_id;
end;
$$;

revoke all on function public.finalize_chat_completion(
  uuid, uuid, text, text, integer, integer, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.finalize_chat_completion(
  uuid, uuid, text, text, integer, integer, jsonb, jsonb
) to authenticated;

comment on function public.finalize_chat_completion(
  uuid, uuid, text, text, integer, integer, jsonb, jsonb
) is 'Atomically persists an assistant response, conversation activity, and usage event inside the authenticated tenant.';
