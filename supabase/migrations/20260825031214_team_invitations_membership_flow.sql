alter table public.organization_members
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists invited_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists removed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.organization_members
set accepted_at = coalesce(accepted_at, created_at),
    updated_at = coalesce(updated_at, created_at)
where status = 'active';

create unique index if not exists organization_members_single_invited_user_idx
  on public.organization_members(user_id)
  where status = 'invited';

create unique index if not exists organization_members_single_team_active_user_idx
  on public.organization_members(user_id)
  where status = 'active' and role <> 'owner';

drop policy if exists "profiles_select_self_or_colleague" on public.profiles;
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self_colleague_or_admin"
on public.profiles for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.organization_members om
    where om.user_id = profiles.id
      and (
        (om.status = 'active' and public.is_org_member(om.organization_id))
        or public.is_org_admin(om.organization_id)
      )
  )
);

create or replace function public.check_organization_member_invitation(
  target_organization_id uuid,
  target_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text;
  target_user_id uuid;
  active_or_invited_members integer;
  user_limit integer;
begin
  normalized_email := lower(btrim(target_email));

  if normalized_email = '' or normalized_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_member_email' using errcode = '22023';
  end if;

  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = normalized_email
  limit 1;

  if target_user_id is not null then
    if exists (
      select 1
      from public.organizations o
      where o.id = target_organization_id
        and o.owner_id = target_user_id
    ) then
      raise exception 'organization_owner_immutable' using errcode = '42501';
    end if;

    if exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and om.user_id = target_user_id
        and om.status in ('active', 'invited')
    ) then
      raise exception 'member_already_in_organization' using errcode = '23505';
    end if;

    if exists (
      select 1
      from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.user_id = target_user_id
        and om.organization_id <> target_organization_id
        and om.status in ('active', 'invited')
        and om.role <> 'owner'
        and o.owner_id <> target_user_id
    ) then
      raise exception 'member_already_bound_to_team_account' using errcode = '23505';
    end if;
  end if;

  select coalesce((p.limits ->> 'users')::integer, 1)
  into user_limit
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.organization_id = target_organization_id
    and s.status in ('active', 'trialing', 'manual');

  user_limit := coalesce(user_limit, 1);

  select count(*) into active_or_invited_members
  from public.organization_members om
  where om.organization_id = target_organization_id
    and om.status in ('active', 'invited');

  if active_or_invited_members >= user_limit then
    raise exception 'organization_user_limit_reached' using errcode = 'P0001';
  end if;

  return target_user_id;
end;
$$;

create or replace function public.create_organization_member_invitation(
  target_organization_id uuid,
  target_user_id uuid,
  target_email text,
  target_name text,
  target_role public.organization_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text;
  auth_email text;
  active_or_invited_members integer;
  user_limit integer;
begin
  normalized_email := lower(btrim(target_email));

  if target_user_id is null then
    raise exception 'target_user_required' using errcode = '22023';
  end if;

  if target_role = 'owner' then
    raise exception 'owner_role_not_assignable' using errcode = '22023';
  end if;

  if not public.is_org_admin(target_organization_id) then
    raise exception 'organization_admin_required' using errcode = '42501';
  end if;

  select lower(u.email) into auth_email
  from auth.users u
  where u.id = target_user_id;

  if auth_email is null or auth_email <> normalized_email then
    raise exception 'target_user_email_mismatch' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.organizations o
    where o.id = target_organization_id
      and o.owner_id = target_user_id
  ) then
    raise exception 'organization_owner_immutable' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = target_user_id
      and om.status in ('active', 'invited')
  ) then
    raise exception 'member_already_in_organization' using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.user_id = target_user_id
      and om.organization_id <> target_organization_id
      and om.status in ('active', 'invited')
      and om.role <> 'owner'
      and o.owner_id <> target_user_id
  ) then
    raise exception 'member_already_bound_to_team_account' using errcode = '23505';
  end if;

  select coalesce((p.limits ->> 'users')::integer, 1)
  into user_limit
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.organization_id = target_organization_id
    and s.status in ('active', 'trialing', 'manual');

  user_limit := coalesce(user_limit, 1);

  select count(*) into active_or_invited_members
  from public.organization_members om
  where om.organization_id = target_organization_id
    and om.status in ('active', 'invited');

  if active_or_invited_members >= user_limit then
    raise exception 'organization_user_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, name, email, avatar_url)
  values (
    target_user_id,
    nullif(btrim(target_name), ''),
    normalized_email,
    null
  )
  on conflict (id) do update
  set name = coalesce(excluded.name, public.profiles.name),
      email = excluded.email;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_by,
    invited_at,
    updated_at
  )
  values (
    target_organization_id,
    target_user_id,
    target_role,
    'invited',
    (select auth.uid()),
    now(),
    now()
  )
  on conflict on constraint organization_members_organization_id_user_id_key
  do update
  set role = excluded.role,
      status = 'invited',
      invited_by = excluded.invited_by,
      invited_at = now(),
      accepted_at = null,
      removed_at = null,
      updated_at = now()
  where public.organization_members.status = 'removed';
end;
$$;

create or replace function public.accept_organization_member_invitation()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  target_membership record;
begin
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select om.id, om.organization_id
  into target_membership
  from public.organization_members om
  where om.user_id = current_user_id
    and om.status = 'invited'
  order by om.invited_at desc nulls last, om.created_at desc
  limit 1;

  if target_membership.id is null then
    raise exception 'member_invitation_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.user_id = current_user_id
      and om.organization_id <> target_membership.organization_id
      and om.status = 'active'
      and om.role <> 'owner'
      and o.owner_id <> current_user_id
  ) then
    raise exception 'member_already_bound_to_team_account' using errcode = '23505';
  end if;

  update public.organization_members
  set status = 'active',
      accepted_at = now(),
      removed_at = null,
      updated_at = now()
  where id = target_membership.id;

  return target_membership.organization_id;
end;
$$;

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
declare
  active_members integer;
  user_limit integer;
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

  if target_status = 'active' and exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.user_id = target_user_id
      and om.organization_id <> target_organization_id
      and om.status = 'active'
      and om.role <> 'owner'
      and o.owner_id <> target_user_id
  ) then
    raise exception 'member_already_bound_to_team_account' using errcode = '23505';
  end if;

  if target_status = 'active' then
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
      and om.status = 'active'
      and om.user_id <> target_user_id;

    if active_members >= user_limit then
      raise exception 'organization_user_limit_reached' using errcode = 'P0001';
    end if;
  end if;

  update public.organization_members
  set role = target_role,
      status = target_status,
      accepted_at = case when target_status = 'active' then coalesce(accepted_at, now()) else accepted_at end,
      removed_at = case when target_status = 'removed' then now() else null end,
      updated_at = now()
  where organization_id = target_organization_id
    and user_id = target_user_id;

  if not found then
    raise exception 'organization_member_not_found' using errcode = 'P0002';
  end if;
end;
$$;

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
begin
  raise exception 'direct_member_addition_disabled' using errcode = '42501';
end;
$$;

revoke all on function public.check_organization_member_invitation(uuid, text)
  from public, anon, authenticated;
grant execute on function public.check_organization_member_invitation(uuid, text)
  to authenticated;

revoke all on function public.create_organization_member_invitation(
  uuid, uuid, text, text, public.organization_role
) from public, anon, authenticated;
grant execute on function public.create_organization_member_invitation(
  uuid, uuid, text, text, public.organization_role
) to authenticated;

revoke all on function public.accept_organization_member_invitation()
  from public, anon, authenticated;
grant execute on function public.accept_organization_member_invitation()
  to authenticated;

revoke all on function public.manage_organization_member(
  uuid, uuid, public.organization_role, public.member_status
) from public, anon, authenticated;
grant execute on function public.manage_organization_member(
  uuid, uuid, public.organization_role, public.member_status
) to authenticated;

revoke all on function public.add_organization_member_by_email(
  uuid, text, public.organization_role
) from public, anon, authenticated;
grant execute on function public.add_organization_member_by_email(
  uuid, text, public.organization_role
) to authenticated;
