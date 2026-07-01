insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'knowledge-documents',
  'knowledge-documents',
  false,
  6291456,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/markdown',
    'text/plain',
    'text/x-markdown'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.documents
  add column if not exists file_size bigint,
  add column if not exists chunk_count integer not null default 0,
  add column if not exists embedding_model text,
  add column if not exists processed_at timestamptz;

create index if not exists documents_organization_status_idx
  on public.documents(organization_id, status, created_at desc);

create index if not exists documents_knowledge_base_id_idx
  on public.documents(knowledge_base_id);

create index if not exists document_chunks_organization_document_idx
  on public.document_chunks(organization_id, document_id, chunk_index);

create policy "knowledge_documents_select_member"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'knowledge-documents'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );

create policy "knowledge_documents_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'knowledge-documents'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "knowledge_documents_update_admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'knowledge-documents'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'knowledge-documents'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "knowledge_documents_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'knowledge-documents'
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
