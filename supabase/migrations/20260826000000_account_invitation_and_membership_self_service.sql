-- Account self-service is intentionally limited to the authenticated user's own rows.

create or replace function public.list_my_pending_organization_member_invitations()
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  role public.organization_role,
  invited_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
begin
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  return query
  select
    organization.id,
    organization.name,
    organization.slug,
    membership.role,
    membership.invited_at
  from public.organization_members membership
  join public.organizations organization on organization.id = membership.organization_id
  where membership.user_id = current_user_id
    and membership.status = 'invited'
  order by membership.invited_at desc nulls last, membership.created_at desc;
end;
$$;

create or replace function public.leave_organization_membership(
  target_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
begin
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.organization_members membership
  set
    status = 'removed',
    removed_at = now(),
    updated_at = now()
  from public.organizations organization
  where membership.organization_id = target_organization_id
    and membership.organization_id = organization.id
    and membership.user_id = current_user_id
    and membership.status = 'active'
    and membership.role <> 'owner'
    and organization.owner_id <> current_user_id;

  if not found then
    raise exception 'organization_membership_not_leavable' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.list_my_pending_organization_member_invitations()
  from public, anon, authenticated;
grant execute on function public.list_my_pending_organization_member_invitations()
  to authenticated;

revoke all on function public.leave_organization_membership(uuid)
  from public, anon, authenticated;
grant execute on function public.leave_organization_membership(uuid)
  to authenticated;
