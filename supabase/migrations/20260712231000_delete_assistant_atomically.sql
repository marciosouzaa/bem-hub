create or replace function public.set_default_assistant(
  target_organization_id uuid,
  target_assistant_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  perform 1
  from public.organizations o
  where o.id = target_organization_id
  for update;

  if not exists (
    select 1
    from public.assistants a
    where a.id = target_assistant_id
      and a.organization_id = target_organization_id
  ) then
    raise exception 'assistant_not_found' using errcode = 'P0002';
  end if;

  update public.assistants
  set is_default = (id = target_assistant_id)
  where organization_id = target_organization_id
    and is_default is distinct from (id = target_assistant_id);
end;
$$;

create or replace function public.delete_assistant(
  target_organization_id uuid,
  target_assistant_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_was_default boolean;
begin
  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  perform 1
  from public.organizations o
  where o.id = target_organization_id
  for update;

  select a.is_default
  into deleted_was_default
  from public.assistants a
  where a.id = target_assistant_id
    and a.organization_id = target_organization_id
  for update;

  if not found then
    raise exception 'assistant_not_found' using errcode = 'P0002';
  end if;

  delete from public.assistants
  where id = target_assistant_id
    and organization_id = target_organization_id;

  if deleted_was_default then
    update public.assistants
    set is_default = true
    where id = (
      select a.id
      from public.assistants a
      where a.organization_id = target_organization_id
      order by a.created_at, a.id
      limit 1
    );
  end if;
end;
$$;

revoke all on function public.delete_assistant(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_assistant(uuid, uuid)
  to authenticated;

comment on function public.delete_assistant(uuid, uuid) is
  'Atomically deletes an assistant and promotes the oldest remaining assistant when needed; caller must be an organization admin.';
