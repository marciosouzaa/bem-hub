alter table public.documents
  add column if not exists source_kind text not null default 'document'
    check (source_kind in ('document', 'catalog')),
  add column if not exists catalog_version integer,
  add column if not exists superseded_at timestamptz;

create unique index if not exists documents_one_active_catalog_per_org_idx
  on public.documents(organization_id)
  where source_kind = 'catalog' and superseded_at is null;

create or replace function public.activate_catalog_version(
  target_organization_id uuid,
  target_document_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_version integer;
begin
  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  perform 1 from public.organizations o
  where o.id = target_organization_id for update;

  if not exists (
    select 1 from public.documents d
    where d.id = target_document_id
      and d.organization_id = target_organization_id
      and d.source_kind = 'catalog'
      and d.status = 'ready'
  ) then
    raise exception 'ready_catalog_not_found' using errcode = 'P0002';
  end if;

  select coalesce(max(d.catalog_version), 0) + 1 into next_version
  from public.documents d
  where d.organization_id = target_organization_id
    and d.source_kind = 'catalog';

  update public.documents
  set superseded_at = clock_timestamp()
  where organization_id = target_organization_id
    and source_kind = 'catalog'
    and id <> target_document_id
    and superseded_at is null;

  update public.documents
  set catalog_version = next_version,
      superseded_at = null
  where id = target_document_id
    and organization_id = target_organization_id;

  return next_version;
end;
$$;

revoke all on function public.activate_catalog_version(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.activate_catalog_version(uuid, uuid)
  to authenticated;

create or replace function public.match_document_chunks(
  target_organization_id uuid,
  query_embedding extensions.vector(1536),
  match_count integer default 6
)
returns table (id uuid, document_id uuid, content text, similarity double precision)
language sql security invoker set search_path = '' stable
as $$
  select dc.id, dc.document_id, dc.content,
    1 - (dc.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.document_chunks dc
  inner join public.documents d
    on d.id = dc.document_id
    and d.organization_id = dc.organization_id
    and d.status = 'ready'
    and (d.source_kind <> 'catalog' or d.superseded_at is null)
  where dc.organization_id = target_organization_id
    and dc.embedding is not null
    and public.is_org_member(target_organization_id)
  order by dc.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(greatest(coalesce(match_count, 6), 1), 20);
$$;
