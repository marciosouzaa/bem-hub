create index if not exists support_message_attachments_message_fkey_idx
  on public.support_message_attachments(message_id, organization_id);

create index if not exists support_message_reactions_channel_connection_id_fkey_idx
  on public.support_message_reactions(channel_connection_id);

create index if not exists support_message_reactions_message_fkey_idx
  on public.support_message_reactions(message_id, organization_id);

create index if not exists support_messages_reply_to_message_fkey_idx
  on public.support_messages(reply_to_message_id, organization_id);
