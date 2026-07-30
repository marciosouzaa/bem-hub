begin;
select plan(25);

select ok(
  to_regclass('public.channel_provisioning_runs') is not null,
  'managed channel provisioning runs exist'
);
select is(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.channel_provisioning_runs'::regclass
  ),
  true,
  'managed channel provisioning runs enforce RLS'
);
select ok(
  not has_table_privilege(
    'anon',
    'public.channel_provisioning_runs',
    'select'
  ),
  'anon cannot inspect managed provisioning runs'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.channel_provisioning_runs',
    'select'
  ),
  'authenticated users cannot inspect internal provisioning details'
);
select ok(
  has_table_privilege(
    'service_role',
    'public.channel_provisioning_runs',
    'select'
  ),
  'service role can inspect managed provisioning runs'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.register_managed_channel_provisioning(uuid,text,text,uuid)',
    'execute'
  ),
  'anon cannot start managed channel provisioning'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.register_managed_channel_provisioning(uuid,text,text,uuid)',
    'execute'
  ),
  'authenticated admins can request managed channel provisioning'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid =
      'public.register_managed_channel_provisioning(uuid,text,text,uuid)'::regprocedure
  ),
  true,
  'managed provisioning registration is a hardened security definer'
);
select ok(
  (
    select 'search_path=""' = any(coalesce(proconfig, array[]::text[]))
    from pg_proc
    where oid =
      'public.register_managed_channel_provisioning(uuid,text,text,uuid)'::regprocedure
  ),
  'managed provisioning registration has an empty search path'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_managed_channel_provisioning(uuid,uuid)',
    'execute'
  ),
  'authenticated users cannot claim a provisioning worker lease'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.claim_managed_channel_provisioning(uuid,uuid)',
    'execute'
  ),
  'service role can claim a provisioning worker lease'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid =
      'public.claim_managed_channel_provisioning(uuid,uuid)'::regprocedure
  ),
  false,
  'managed provisioning lease claim is security invoker'
);
select is(
  (
    select is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'channel_connections'
      and column_name = 'phone_number'
  ),
  'YES',
  'managed channels can exist before WhatsApp reveals the phone number'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.channel_connections'::regclass
      and conname = 'channel_connections_management_mode_check'
  ),
  'channel management mode rejects unknown values'
);
select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'channel_provisioning_runs_active_channel_idx'
      and indexdef like '%UNIQUE INDEX%'
  ),
  'one active provisioning run is enforced per channel'
);
select has_column(
  'public',
  'channel_connections',
  'managed_request_id',
  'managed request reference is available without exposing internal runs'
);
select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'channel_connections_managed_request_idx'
      and indexdef like '%UNIQUE INDEX%'
  ),
  'managed request reference is unique inside an organization'
);
select ok(
  pg_catalog.strpos(
    pg_catalog.pg_get_functiondef(
      'public.list_channel_connections(uuid)'::regprocedure
    ),
    'channel_provisioning_runs'
  ) = 0,
  'channel listing does not require client access to internal provisioning runs'
);

insert into auth.users (id, email)
values
  ('71000000-0000-0000-0000-000000000001', 'managed-owner-a@example.test'),
  ('72000000-0000-0000-0000-000000000002', 'managed-owner-b@example.test'),
  ('73000000-0000-0000-0000-000000000003', 'managed-member-a@example.test');

insert into public.organizations (id, name, slug, owner_id)
values
  (
    '7a000000-0000-0000-0000-000000000001',
    'Managed Tenant A',
    'managed-tenant-a',
    '71000000-0000-0000-0000-000000000001'
  ),
  (
    '7b000000-0000-0000-0000-000000000002',
    'Managed Tenant B',
    'managed-tenant-b',
    '72000000-0000-0000-0000-000000000002'
  );

insert into public.organization_members (organization_id, user_id, role, status)
values
  (
    '7a000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    '7b000000-0000-0000-0000-000000000002',
    '72000000-0000-0000-0000-000000000002',
    'owner',
    'active'
  ),
  (
    '7a000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0000-000000000003',
    'member',
    'active'
  );

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (
    public.register_managed_channel_provisioning(
      '7a000000-0000-0000-0000-000000000001',
      'WhatsApp gerenciado',
      'wuzapi',
      '7f000000-0000-4000-8000-000000000001'
    ) ->> 'created'
  )::boolean,
  true,
  'tenant admin creates one managed channel request'
);
select is(
  (
    public.register_managed_channel_provisioning(
      '7a000000-0000-0000-0000-000000000001',
      'WhatsApp gerenciado',
      'wuzapi',
      '7f000000-0000-4000-8000-000000000001'
    ) ->> 'created'
  )::boolean,
  false,
  'repeating a managed channel request is idempotent'
);

reset role;
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select is(
  (
    select count(*)
    from public.channel_provisioning_runs
    where organization_id = '7a000000-0000-0000-0000-000000000001'
      and request_id = '7f000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'idempotent request persists exactly one internal run'
);
select is(
  public.claim_managed_channel_provisioning(
    '7a000000-0000-0000-0000-000000000001',
    (
      select id
      from public.channel_provisioning_runs
      where organization_id = '7a000000-0000-0000-0000-000000000001'
        and request_id = '7f000000-0000-4000-8000-000000000001'
    )
  ),
  true,
  'service worker claims the queued run'
);
select is(
  public.claim_managed_channel_provisioning(
    '7a000000-0000-0000-0000-000000000001',
    (
      select id
      from public.channel_provisioning_runs
      where organization_id = '7a000000-0000-0000-0000-000000000001'
        and request_id = '7f000000-0000-4000-8000-000000000001'
    )
  ),
  false,
  'an active worker lease cannot be claimed twice'
);

reset role;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$select public.register_managed_channel_provisioning(
    '7b000000-0000-0000-0000-000000000002',
    'Tentativa cruzada',
    'wuzapi',
    '7f000000-0000-4000-8000-000000000002'
  )$$,
  '42501',
  'organization_admin_required',
  'tenant admin cannot provision a channel in another tenant'
);

set local request.jwt.claims =
  '{"sub":"73000000-0000-0000-0000-000000000003","role":"authenticated"}';
select throws_ok(
  $$select public.register_managed_channel_provisioning(
    '7a000000-0000-0000-0000-000000000001',
    'Tentativa de membro',
    'wuzapi',
    '7f000000-0000-4000-8000-000000000003'
  )$$,
  '42501',
  'organization_admin_required',
  'organization member cannot provision a managed channel'
);

reset role;
select * from finish();
rollback;
