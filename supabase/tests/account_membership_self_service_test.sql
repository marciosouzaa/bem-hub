begin;
select plan(10);

select ok(
  to_regprocedure('public.list_my_pending_organization_member_invitations()') is not null,
  'pending invitation listing RPC exists'
);
select ok(
  to_regprocedure('public.leave_organization_membership(uuid)') is not null,
  'self-unlink RPC exists'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.list_my_pending_organization_member_invitations()'::regprocedure),
  true,
  'pending invitation listing uses a protected implementation'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.leave_organization_membership(uuid)'::regprocedure),
  true,
  'self-unlink uses a protected implementation'
);
select ok(
  not has_function_privilege('anon', 'public.list_my_pending_organization_member_invitations()', 'execute'),
  'anon cannot list pending invitations'
);
select ok(
  has_function_privilege('authenticated', 'public.list_my_pending_organization_member_invitations()', 'execute'),
  'authenticated users can list only their pending invitations'
);
select ok(
  not has_function_privilege('anon', 'public.leave_organization_membership(uuid)', 'execute'),
  'anon cannot unlink memberships'
);
select ok(
  has_function_privilege('authenticated', 'public.leave_organization_membership(uuid)', 'execute'),
  'authenticated users can request their own unlink'
);
select like(
  pg_get_functiondef('public.leave_organization_membership(uuid)'::regprocedure),
  '%membership.user_id = current_user_id%',
  'self-unlink predicates the mutation on the authenticated user'
);
select like(
  pg_get_functiondef('public.leave_organization_membership(uuid)'::regprocedure),
  '%membership.role <> ''owner''%',
  'self-unlink cannot remove owner memberships'
);

select * from finish();
rollback;
