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

revoke all on function public.set_default_assistant(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_default_assistant(uuid, uuid)
  to authenticated;

comment on function public.set_default_assistant(uuid, uuid) is
  'Atomically selects one default assistant inside an organization; caller must be an organization admin.';
