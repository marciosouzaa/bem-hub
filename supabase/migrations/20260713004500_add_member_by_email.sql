create or replace function public.add_organization_member_by_email(
  target_organization_id uuid,
  target_email text,
  target_role public.organization_role default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  active_members integer;
  user_limit integer;
begin
  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  if target_role = 'owner' then
    raise exception 'owner_role_not_assignable' using errcode = '22023';
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(btrim(target_email))
  limit 1;

  if target_user_id is null then
    raise exception 'member_not_available' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.organizations o
    where o.id = target_organization_id
      and o.owner_id = target_user_id
  ) then
    raise exception 'organization_owner_immutable' using errcode = '42501';
  end if;

  select coalesce((p.limits ->> 'users')::integer, 1)
  into user_limit
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.organization_id = target_organization_id
    and s.status in ('active', 'trialing', 'manual');

  user_limit := coalesce(user_limit, 1);

  select count(*) into active_members
  from public.organization_members om
  where om.organization_id = target_organization_id
    and om.status = 'active';

  if not exists (
    select 1 from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = target_user_id
      and om.status = 'active'
  ) and active_members >= user_limit then
    raise exception 'organization_user_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (target_organization_id, target_user_id, target_role, 'active')
  on conflict (organization_id, user_id) do update
  set role = excluded.role, status = 'active';

  return target_user_id;
end;
$$;

revoke all on function public.add_organization_member_by_email(
  uuid, text, public.organization_role
) from public, anon, authenticated;
grant execute on function public.add_organization_member_by_email(
  uuid, text, public.organization_role
) to authenticated;
