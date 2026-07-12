alter table public.messages add column if not exists request_id uuid;
create unique index if not exists messages_user_request_id_idx
  on public.messages(organization_id, request_id)
  where role = 'user' and request_id is not null;
