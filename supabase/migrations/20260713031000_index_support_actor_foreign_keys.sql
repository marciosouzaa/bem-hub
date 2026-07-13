create index if not exists support_conversations_assigned_to_idx
  on public.support_conversations(assigned_to);
create index if not exists support_messages_sent_by_idx
  on public.support_messages(sent_by);
