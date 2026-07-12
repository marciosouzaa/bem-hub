drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self_or_colleague"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.organization_members om
    where om.user_id = profiles.id
      and om.status = 'active'
      and public.is_org_member(om.organization_id)
  )
);

create or replace function public.manage_organization_member(
  target_organization_id uuid,
  target_user_id uuid,
  target_role public.organization_role,
  target_status public.member_status
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

  if target_role = 'owner' or target_status = 'invited' then
    raise exception 'invalid_membership_transition' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.organizations o
    where o.id = target_organization_id
      and o.owner_id = target_user_id
  ) then
    raise exception 'organization_owner_immutable' using errcode = '42501';
  end if;

  update public.organization_members
  set role = target_role,
      status = target_status
  where organization_id = target_organization_id
    and user_id = target_user_id;

  if not found then
    raise exception 'organization_member_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.manage_organization_member(
  uuid, uuid, public.organization_role, public.member_status
) from public, anon, authenticated;
grant execute on function public.manage_organization_member(
  uuid, uuid, public.organization_role, public.member_status
) to authenticated;
