create or replace function public.bootstrap_owned_organization(
  target_organization_id uuid
)
returns table (
  organization_id uuid,
  role public.organization_role
)
language plpgsql
security definer
set search_path = public
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
  on conflict (organization_id, user_id)
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
    on conflict (organization_id) do nothing;
  end if;

  return query
  select target_organization_id, 'owner'::public.organization_role;
end;
$$;

revoke all on function public.bootstrap_owned_organization(uuid) from public;
grant execute on function public.bootstrap_owned_organization(uuid) to authenticated;
