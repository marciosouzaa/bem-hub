create index support_conversation_reads_message_fkey_idx
  on public.support_conversation_reads(
    organization_id,
    conversation_id,
    last_read_message_id
  )
  where last_read_message_id is not null;

create index support_conversation_reads_user_id_idx
  on public.support_conversation_reads(user_id);
