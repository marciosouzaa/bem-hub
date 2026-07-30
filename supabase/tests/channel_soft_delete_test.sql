begin;
select plan(24);

select has_column(
  'public',
  'channel_connections',
  'is_deleted',
  'channels expose the soft-delete flag'
);
select has_column(
  'public',
  'channel_connections',
  'deleted_at',
  'channels expose the deletion timestamp'
);
select is(
  (
    select column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'channel_connections'
      and column_name = 'is_deleted'
  ),
  'false',
  'new channels are active by default'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.channel_connections'::regclass
      and conname = 'channel_connections_deletion_state_check'
  ),
  'deleted channels must keep a consistent disabled state'
);
select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'channel_connections_active_phone_number_idx'
      and indexdef like '%is_deleted = false%'
  ),
  'phone uniqueness applies only to active channels'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.delete_channel_connection(uuid,uuid)',
    'execute'
  ),
  'authenticated admins can invoke channel deletion'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.delete_channel_connection(uuid,uuid)',
    'execute'
  ),
  'anonymous users cannot invoke channel deletion'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.channel_connections',
    'delete'
  ),
  'authenticated users cannot bypass soft deletion with table delete'
);
select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'channel_connections'
      and cmd = 'DELETE'
  ),
  'channel table exposes no physical-delete policy'
);

insert into auth.users (id, email)
values
  ('81000000-0000-0000-0000-000000000001', 'delete-owner@example.test'),
  ('82000000-0000-0000-0000-000000000002', 'delete-member@example.test');

insert into public.organizations (id, name, slug, owner_id)
values (
  '8a000000-0000-0000-0000-000000000001',
  'Delete Tenant',
  'delete-tenant',
  '81000000-0000-0000-0000-000000000001'
);

insert into public.organization_members (
  organization_id,
  user_id,
  role,
  status
) values
  (
    '8a000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    '8a000000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000002',
    'member',
    'active'
  );

insert into public.channel_connections (
  id,
  organization_id,
  kind,
  provider,
  display_name,
  phone_number,
  status
) values (
  '8c000000-0000-0000-0000-000000000001',
  '8a000000-0000-0000-0000-000000000001',
  'unofficial',
  'wuzapi',
  'Canal com histórico',
  '5511999990001',
  'connected'
);

insert into public.contacts (
  id,
  organization_id,
  name,
  phone
) values (
  '8d000000-0000-0000-0000-000000000001',
  '8a000000-0000-0000-0000-000000000001',
  'Contato histórico',
  '5511988880001'
);

insert into public.support_conversations (
  id,
  organization_id,
  contact_id,
  channel_connection_id
) values (
  '8e000000-0000-0000-0000-000000000001',
  '8a000000-0000-0000-0000-000000000001',
  '8d000000-0000-0000-0000-000000000001',
  '8c000000-0000-0000-0000-000000000001'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  jsonb_array_length(
    public.list_channel_connections(
      '8a000000-0000-0000-0000-000000000001'
    )
  ),
  1,
  'active channel appears in channel management'
);
select is(
  public.get_support_inbox_operational(
    '8a000000-0000-0000-0000-000000000001'
  ) -> 0 -> 'channel' ->> 'operationalStatus',
  'connected',
  'attendance reports a connected channel before deletion'
);
select lives_ok(
  $$select public.delete_channel_connection(
    '8a000000-0000-0000-0000-000000000001',
    '8c000000-0000-0000-0000-000000000001'
  )$$,
  'admin can delete a channel linked to attendance'
);
select is(
  (
    select count(*)
    from public.channel_connections
    where id = '8c000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'soft deletion preserves the channel row'
);
select is(
  (
    select is_deleted
    from public.channel_connections
    where id = '8c000000-0000-0000-0000-000000000001'
  ),
  true,
  'soft deletion marks the channel as deleted'
);
select ok(
  (
    select deleted_at is not null
    from public.channel_connections
    where id = '8c000000-0000-0000-0000-000000000001'
  ),
  'soft deletion records its timestamp'
);
select is(
  (
    select status
    from public.channel_connections
    where id = '8c000000-0000-0000-0000-000000000001'
  ),
  'disabled',
  'soft deletion disables channel operations'
);
select is(
  jsonb_array_length(
    public.list_channel_connections(
      '8a000000-0000-0000-0000-000000000001'
    )
  ),
  0,
  'deleted channel disappears from channel management'
);
select is(
  public.get_support_inbox_operational(
    '8a000000-0000-0000-0000-000000000001'
  ) -> 0 -> 'channel' ->> 'operationalStatus',
  'inactive',
  'attendance inbox preserves and marks the inactive channel'
);
select is(
  public.get_support_conversation(
    '8a000000-0000-0000-0000-000000000001',
    '8e000000-0000-0000-0000-000000000001'
  ) -> 'channel' ->> 'operationalStatus',
  'inactive',
  'attendance detail preserves and marks the inactive channel'
);
select lives_ok(
  $$insert into public.channel_connections (
    id,
    organization_id,
    kind,
    provider,
    display_name,
    phone_number,
    status
  ) values (
    '8c000000-0000-0000-0000-000000000002',
    '8a000000-0000-0000-0000-000000000001',
    'unofficial',
    'wuzapi',
    'Canal reutilizado',
    '5511999990001',
    'draft'
  )$$,
  'deleted channel releases its phone number for reuse'
);
select throws_ok(
  $$insert into public.channel_connections (
    organization_id,
    kind,
    provider,
    display_name,
    phone_number,
    status
  ) values (
    '8a000000-0000-0000-0000-000000000001',
    'unofficial',
    'wuzapi',
    'Canal duplicado',
    '5511999990001',
    'draft'
  )$$,
  '23505',
  null,
  'two active channels cannot reuse the same phone number'
);
select throws_ok(
  $$update public.channel_connections
    set status = 'connected'
    where id = '8c000000-0000-0000-0000-000000000001'$$,
  '23514',
  null,
  'a deleted channel cannot become connected accidentally'
);
select lives_ok(
  $$select public.delete_channel_connection(
    '8a000000-0000-0000-0000-000000000001',
    '8c000000-0000-0000-0000-000000000001'
  )$$,
  'soft deletion is idempotent'
);

set local request.jwt.claims =
  '{"sub":"82000000-0000-0000-0000-000000000002","role":"authenticated"}';
select throws_ok(
  $$select public.delete_channel_connection(
    '8a000000-0000-0000-0000-000000000001',
    '8c000000-0000-0000-0000-000000000002'
  )$$,
  '42501',
  'organization_admin_required',
  'organization members cannot delete channels'
);

reset role;
select * from finish();
rollback;
