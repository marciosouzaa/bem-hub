create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and om.user_id = (select auth.uid())
        and om.status = 'active'
    );
$$;

create or replace function private.is_org_admin(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and om.user_id = (select auth.uid())
        and om.status = 'active'
        and om.role in ('owner', 'admin')
    );
$$;

revoke all on function private.is_org_member(uuid) from public, anon, authenticated;
revoke all on function private.is_org_admin(uuid) from public, anon, authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select private.is_org_member(target_organization_id);
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select private.is_org_admin(target_organization_id);
$$;

create or replace function public.match_document_chunks(
  target_organization_id uuid,
  query_embedding extensions.vector(1536),
  match_count integer default 6
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity double precision
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.document_chunks dc
  where dc.organization_id = target_organization_id
    and dc.embedding is not null
    and public.is_org_member(target_organization_id)
  order by dc.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 6), 1), 20);
$$;

create or replace function public.bootstrap_owned_organization(
  target_organization_id uuid
)
returns table (
  organization_id uuid,
  role public.organization_role
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  free_plan_id uuid;
begin
  if actor_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.organizations o
    where o.id = target_organization_id
      and o.owner_id = actor_id
  ) then
    raise exception 'organization_not_owned' using errcode = '42501';
  end if;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status
  )
  values (
    target_organization_id,
    actor_id,
    'owner',
    'active'
  )
  on conflict on constraint organization_members_organization_id_user_id_key
  do update set
    role = excluded.role,
    status = excluded.status;

  select p.id
  into free_plan_id
  from public.plans p
  where p.key = 'free';

  if free_plan_id is not null then
    insert into public.subscriptions (
      organization_id,
      plan_id,
      status
    )
    values (
      target_organization_id,
      free_plan_id,
      'manual'
    )
    on conflict on constraint subscriptions_organization_id_key do nothing;
  end if;

  return query
  select target_organization_id, 'owner'::public.organization_role;
end;
$$;

revoke all on function public.is_org_member(uuid) from public, anon, authenticated;
revoke all on function public.is_org_admin(uuid) from public, anon, authenticated;
revoke all on function public.match_document_chunks(uuid, extensions.vector, integer)
  from public, anon, authenticated;
revoke all on function public.bootstrap_owned_organization(uuid)
  from public, anon, authenticated;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
grant execute on function public.match_document_chunks(uuid, extensions.vector, integer)
  to authenticated;
grant execute on function public.bootstrap_owned_organization(uuid)
  to authenticated;

comment on function private.is_org_member(uuid) is
  'RLS helper kept outside exposed schemas; evaluates membership for auth.uid().';
comment on function private.is_org_admin(uuid) is
  'RLS helper kept outside exposed schemas; evaluates admin membership for auth.uid().';
comment on function public.match_document_chunks(uuid, extensions.vector, integer) is
  'Tenant-scoped vector search executed with caller privileges and capped at 20 rows.';
comment on function public.bootstrap_owned_organization(uuid) is
  'Bootstraps only an organization owned by auth.uid(); the sole exposed SECURITY DEFINER RPC.';
