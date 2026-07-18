begin;
select plan(122);

select ok(
  not has_function_privilege('anon', 'public.bootstrap_owned_organization(uuid)', 'execute'),
  'anon cannot execute organization bootstrap'
);
select ok(
  not has_function_privilege('anon', 'public.is_org_member(uuid)', 'execute'),
  'anon cannot execute membership helper'
);
select ok(
  not has_function_privilege('anon', 'public.is_org_admin(uuid)', 'execute'),
  'anon cannot execute admin helper'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.match_document_chunks(uuid,extensions.vector,integer)',
    'execute'
  ),
  'anon cannot execute vector search'
);
select ok(
  has_function_privilege('authenticated', 'public.bootstrap_owned_organization(uuid)', 'execute'),
  'authenticated can execute organization bootstrap'
);
select ok(
  not has_function_privilege('anon', 'public.set_default_assistant(uuid,uuid)', 'execute'),
  'anon cannot set a default assistant'
);
select ok(
  has_function_privilege('authenticated', 'public.set_default_assistant(uuid,uuid)', 'execute'),
  'authenticated can call default assistant RPC'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.set_default_assistant(uuid,uuid)'::regprocedure),
  false,
  'default assistant RPC is security invoker'
);
select ok(
  not has_function_privilege('anon', 'public.delete_assistant(uuid,uuid)', 'execute'),
  'anon cannot delete an assistant through the RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.delete_assistant(uuid,uuid)', 'execute'),
  'authenticated can call delete assistant RPC'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.delete_assistant(uuid,uuid)'::regprocedure),
  false,
  'delete assistant RPC is security invoker'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.finalize_chat_completion(uuid,uuid,text,text,integer,integer,jsonb,jsonb)',
    'execute'
  ),
  'anon cannot finalize chat completion'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.finalize_chat_completion(uuid,uuid,text,text,integer,integer,jsonb,jsonb)',
    'execute'
  ),
  'authenticated can finalize chat completion'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.finalize_chat_completion(uuid,uuid,text,text,integer,integer,jsonb,jsonb)'::regprocedure
  ),
  false,
  'chat completion RPC is security invoker'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.add_organization_member_by_email(uuid,text,public.organization_role)',
    'execute'
  ),
  'anon cannot add organization members'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.add_organization_member_by_email(uuid,text,public.organization_role)',
    'execute'
  ),
  'authenticated can call member inclusion RPC'
);
select is(
  (
    select prosecdef from pg_proc
    where oid = 'public.add_organization_member_by_email(uuid,text,public.organization_role)'::regprocedure
  ),
  true,
  'member inclusion RPC is security definer'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.manage_organization_member(uuid,uuid,public.organization_role,public.member_status)',
    'execute'
  ),
  'anon cannot manage organization members'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.manage_organization_member(uuid,uuid,public.organization_role,public.member_status)',
    'execute'
  ),
  'authenticated can call member management RPC'
);
select is(
  (
    select prosecdef from pg_proc
    where oid = 'public.manage_organization_member(uuid,uuid,public.organization_role,public.member_status)'::regprocedure
  ),
  false,
  'member management RPC is security invoker'
);
select ok(
  not has_function_privilege('anon', 'public.activate_catalog_version(uuid,uuid)', 'execute'),
  'anon cannot activate catalog versions'
);
select ok(
  has_function_privilege('authenticated', 'public.activate_catalog_version(uuid,uuid)', 'execute'),
  'authenticated can call catalog activation RPC'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.activate_catalog_version(uuid,uuid)'::regprocedure),
  false,
  'catalog activation RPC is security invoker'
);
select ok(
  not has_function_privilege('anon', 'public.get_support_inbox(uuid)', 'execute'),
  'anon cannot read support inbox'
);
select ok(
  has_function_privilege('authenticated', 'public.get_support_inbox(uuid)', 'execute'),
  'authenticated can call support inbox RPC'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.get_support_inbox(uuid)'::regprocedure),
  false,
  'support inbox RPC is security invoker'
);
select ok(
  has_function_privilege('authenticated', 'public.is_org_member(uuid)', 'execute'),
  'authenticated can execute membership helper'
);
select ok(
  has_function_privilege('authenticated', 'public.is_org_admin(uuid)', 'execute'),
  'authenticated can execute admin helper'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.match_document_chunks(uuid,extensions.vector,integer)',
    'execute'
  ),
  'authenticated can execute vector search'
);
select ok(
  not has_table_privilege('anon', 'public.channel_credentials', 'select'),
  'anon cannot read encrypted channel credentials'
);
select ok(
  not has_table_privilege('authenticated', 'public.channel_credentials', 'select'),
  'authenticated cannot read encrypted channel credentials'
);
select ok(
  not has_table_privilege('anon', 'public.channel_webhook_endpoints', 'select'),
  'anon cannot discover webhook endpoints'
);
select ok(
  not has_table_privilege('authenticated', 'public.channel_webhook_endpoints', 'select'),
  'authenticated cannot discover webhook endpoint secrets'
);
select ok(
  not has_table_privilege('anon', 'public.channel_webhook_events', 'select'),
  'anon cannot read webhook processing events'
);
select ok(
  not has_table_privilege('authenticated', 'public.channel_webhook_events', 'select'),
  'authenticated cannot read internal webhook processing events'
);
select ok(
  not has_table_privilege('anon', 'public.contact_identities', 'select'),
  'anon cannot read provider contact identities'
);
select ok(
  not has_table_privilege('authenticated', 'public.contact_identities', 'select'),
  'authenticated cannot read provider contact identities directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.ingest_channel_inbound_message(uuid,text,text,text,text,text,text,text,timestamptz,text)',
    'execute'
  ),
  'anon cannot execute inbound webhook ingestion'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.ingest_channel_inbound_message(uuid,text,text,text,text,text,text,text,timestamptz,text)',
    'execute'
  ),
  'authenticated cannot execute inbound webhook ingestion'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.ingest_channel_inbound_message(uuid,text,text,text,text,text,text,text,timestamptz,text)',
    'execute'
  ),
  'service role can execute inbound webhook ingestion'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.ingest_channel_inbound_message(uuid,text,text,text,text,text,text,text,timestamptz,text)'::regprocedure
  ),
  false,
  'inbound webhook ingestion is security invoker'
);
select ok(
  (
    select bool_and(relrowsecurity)
    from pg_class
    where oid in (
      'public.channel_webhook_endpoints'::regclass,
      'public.channel_webhook_events'::regclass,
      'public.contact_identities'::regclass
    )
  ),
  'internal webhook tables enforce RLS'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'support_members_receive_org_broadcasts'
      and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
  ),
  'support broadcast has an authenticated read policy'
);
select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'support_members_receive_org_broadcasts'
      and cmd <> 'SELECT'
  ),
  'support clients cannot publish through the broadcast policy'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid = 'private.broadcast_support_change()'::regprocedure
  ),
  true,
  'support broadcast trigger function is security definer'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'private.broadcast_support_change()',
    'execute'
  ),
  'authenticated users cannot execute the support broadcast trigger function'
);
select ok(
  (
    select 'search_path=""' = any(coalesce(proconfig, array[]::text[]))
    from pg_proc
    where oid = 'private.broadcast_support_change()'::regprocedure
  ),
  'support broadcast trigger function has an empty search path'
);
select is(
  (
    select count(*)
    from pg_trigger
    where not tgisinternal
      and tgname in (
        'support_conversations_broadcast_lifecycle',
        'support_conversations_broadcast_state',
        'support_messages_broadcast_change'
      )
  ),
  3::bigint,
  'support tables emit provider-neutral broadcast changes'
);
select has_column(
  'public',
  'channel_connections',
  'webhook_configured_at',
  'channel connection records provider webhook configuration'
);
select has_column(
  'public',
  'support_messages',
  'channel_connection_id',
  'support messages retain their provider channel'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.save_channel_provider_configuration(uuid,uuid,text,text,text,text,uuid,text,text)',
    'execute'
  ),
  'authenticated cannot call privileged channel credential storage'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.save_channel_provider_configuration(uuid,uuid,text,text,text,text,uuid,text,text)',
    'execute'
  ),
  'service role can store channel credentials from the server'
);

select is(
  (select prosecdef from pg_proc where oid = 'public.bootstrap_owned_organization(uuid)'::regprocedure),
  true,
  'bootstrap remains security definer'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.is_org_member(uuid)'::regprocedure),
  false,
  'public membership wrapper is security invoker'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.is_org_admin(uuid)'::regprocedure),
  false,
  'public admin wrapper is security invoker'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.match_document_chunks(uuid,extensions.vector,integer)'::regprocedure
  ),
  false,
  'vector search is security invoker'
);
select is(
  (select prosecdef from pg_proc where oid = 'private.is_org_member(uuid)'::regprocedure),
  true,
  'private membership helper is security definer'
);
select is(
  (select prosecdef from pg_proc where oid = 'private.is_org_admin(uuid)'::regprocedure),
  true,
  'private admin helper is security definer'
);
select ok(
  not exists (
    select 1
    from pg_proc p
    where p.oid in (
      'public.bootstrap_owned_organization(uuid)'::regprocedure,
      'public.is_org_member(uuid)'::regprocedure,
      'public.is_org_admin(uuid)'::regprocedure,
      'public.match_document_chunks(uuid,extensions.vector,integer)'::regprocedure,
      'public.set_default_assistant(uuid,uuid)'::regprocedure,
      'public.delete_assistant(uuid,uuid)'::regprocedure,
      'public.finalize_chat_completion(uuid,uuid,text,text,integer,integer,jsonb,jsonb)'::regprocedure,
      'public.add_organization_member_by_email(uuid,text,public.organization_role)'::regprocedure,
      'public.manage_organization_member(uuid,uuid,public.organization_role,public.member_status)'::regprocedure,
      'public.activate_catalog_version(uuid,uuid)'::regprocedure,
      'public.get_support_inbox(uuid)'::regprocedure,
      'private.is_org_member(uuid)'::regprocedure,
      'private.is_org_admin(uuid)'::regprocedure
    )
      and not ('search_path=""' = any(coalesce(p.proconfig, array[]::text[])))
  ),
  'all security-sensitive functions use an empty search_path'
);

insert into auth.users (id, email)
values
  ('10000000-0000-0000-0000-000000000001', 'tenant-a@example.test'),
  ('20000000-0000-0000-0000-000000000002', 'tenant-b@example.test'),
  ('30000000-0000-0000-0000-000000000003', 'member-a@example.test');

insert into public.organizations (id, name, slug, owner_id)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    'Tenant A',
    'tenant-a-security-test',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Tenant B',
    'tenant-b-security-test',
    '20000000-0000-0000-0000-000000000002'
  );

insert into public.organization_members (organization_id, user_id, role, status)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'owner',
    'active'
  ),
  (
    'a0000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    'member',
    'active'
  );

insert into realtime.messages (
  payload,
  event,
  topic,
  private,
  extension
)
values
  (
    '{"conversationId":"a7000000-0000-0000-0000-000000000001"}',
    'support.inbox.changed',
    'org:a0000000-0000-0000-0000-000000000001:support',
    true,
    'broadcast'
  ),
  (
    '{"conversationId":"b7000000-0000-0000-0000-000000000002"}',
    'support.inbox.changed',
    'org:b0000000-0000-0000-0000-000000000002:support',
    true,
    'broadcast'
  );

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local realtime.topic =
  'org:a0000000-0000-0000-0000-000000000001:support';
select is(
  (
    select count(*)
    from realtime.messages
    where event = 'support.inbox.changed'
  ),
  1::bigint,
  'tenant A receives its private support broadcast'
);
set local realtime.topic =
  'org:b0000000-0000-0000-0000-000000000002:support';
select is(
  (
    select count(*)
    from realtime.messages
    where event = 'support.inbox.changed'
  ),
  0::bigint,
  'tenant A cannot receive tenant B support broadcasts'
);
reset role;

insert into public.automation_runs (
  id,
  organization_id,
  status,
  input,
  created_by
)
values
  (
    'a2000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'running',
    '{"template_id":"summarize"}',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'b2000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'running',
    '{"template_id":"summarize"}',
    '20000000-0000-0000-0000-000000000002'
  );

insert into public.assistants (
  id,
  organization_id,
  name,
  instructions,
  created_by
)
values
  (
    'a4000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Tenant A assistant 1',
    'Tenant A instructions',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'a4000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Tenant A assistant 2',
    'Tenant A instructions',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'b4000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'Tenant B assistant',
    'Tenant B instructions',
    '20000000-0000-0000-0000-000000000002'
  );

select throws_ok(
  $$
    update public.assistants
    set is_default = true
    where organization_id = 'a0000000-0000-0000-0000-000000000001'
  $$,
  '23505',
  'duplicate key value violates unique constraint "assistants_single_default_per_org_idx"',
  'database rejects two default assistants in one organization'
);

insert into public.conversations (
  id,
  organization_id,
  user_id,
  title
)
values (
  'a3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Tenant A conversation'
);

insert into public.documents (
  id,
  organization_id,
  name,
  file_path,
  mime_type,
  status,
  created_by
)
values
  (
    'a1000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'tenant-a.txt',
    'a0000000-0000-0000-0000-000000000001/a1000000-0000-0000-0000-000000000001/tenant-a.txt',
    'text/plain',
    'ready',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'b1000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'tenant-b.txt',
    'b0000000-0000-0000-0000-000000000002/b1000000-0000-0000-0000-000000000002/tenant-b.txt',
    'text/plain',
    'ready',
    '20000000-0000-0000-0000-000000000002'
  ),
  (
    'a1000000-0000-0000-0000-000000000011',
    'a0000000-0000-0000-0000-000000000001',
    'catalog-v1.csv',
    'a0000000-0000-0000-0000-000000000001/catalog-v1.csv',
    'text/csv',
    'ready',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'a1000000-0000-0000-0000-000000000012',
    'a0000000-0000-0000-0000-000000000001',
    'catalog-v2.csv',
    'a0000000-0000-0000-0000-000000000001/catalog-v2.csv',
    'text/csv',
    'ready',
    '10000000-0000-0000-0000-000000000001'
  );

update public.documents
set source_kind = 'catalog', superseded_at = clock_timestamp()
where id in (
  'a1000000-0000-0000-0000-000000000011',
  'a1000000-0000-0000-0000-000000000012'
);

insert into public.document_chunks (
  organization_id,
  document_id,
  content,
  chunk_index,
  embedding
)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'private content for tenant A',
    0,
    array_fill(0::real, array[1536])::extensions.vector
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000002',
    'private content for tenant B',
    0,
    array_fill(1::real, array[1536])::extensions.vector
  );

insert into storage.objects (bucket_id, name, owner_id)
values
  (
    'knowledge-documents',
    'a0000000-0000-0000-0000-000000000001/a1000000-0000-0000-0000-000000000001/tenant-a.txt',
    '10000000-0000-0000-0000-000000000001'
  ),
  (
    'knowledge-documents',
    'b0000000-0000-0000-0000-000000000002/b1000000-0000-0000-0000-000000000002/tenant-b.txt',
    '20000000-0000-0000-0000-000000000002'
  );

insert into public.channel_connections (id, organization_id, kind, provider, display_name, phone_number)
values
  ('ca000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'official', 'pending-provider', 'Canal A', '+551100000001'),
  ('cb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'unofficial', 'pending-provider', 'Canal B', '+551100000002');
select is(
  (select status from public.channel_connections where id = 'ca000000-0000-0000-0000-000000000001'),
  'draft',
  'new channel connections start as draft'
);
insert into public.contacts (id, organization_id, name, phone)
values
  ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Contato A', '+551199999001'),
  ('c2000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Contato B', '+551199999002');
insert into public.support_conversations (organization_id, contact_id, channel_connection_id)
values
  ('a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000002', 'cb000000-0000-0000-0000-000000000002');
select ok(
  exists (
    select 1
    from realtime.messages
    where event = 'support.inbox.changed'
      and topic = 'org:a0000000-0000-0000-0000-000000000001:support'
      and payload ->> 'entity' = 'support_conversations'
      and payload ->> 'operation' = 'insert'
  ),
  'support conversation trigger publishes a private invalidation'
);

create temporary table tenant_a_results (
  member_own boolean,
  member_other boolean,
  admin_own boolean,
  admin_other boolean,
  documents_own bigint,
  documents_other bigint,
  matches_own bigint,
  matches_other bigint,
  storage_own bigint,
  storage_other bigint,
  deleted_other bigint,
  runs_other bigint,
  updated_run_own bigint,
  updated_run_other bigint
) on commit drop;
grant insert, select on tenant_a_results to authenticated;

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';

with deleted as (
  delete from public.documents
  where id = 'b1000000-0000-0000-0000-000000000002'
  returning id
), updated_run_own as (
  update public.automation_runs
  set status = 'succeeded'
  where id = 'a2000000-0000-0000-0000-000000000001'
  returning id
), updated_run_other as (
  update public.automation_runs
  set status = 'succeeded'
  where id = 'b2000000-0000-0000-0000-000000000002'
  returning id
)
insert into tenant_a_results
select
  public.is_org_member('a0000000-0000-0000-0000-000000000001'),
  public.is_org_member('b0000000-0000-0000-0000-000000000002'),
  public.is_org_admin('a0000000-0000-0000-0000-000000000001'),
  public.is_org_admin('b0000000-0000-0000-0000-000000000002'),
  (select count(*) from public.documents where organization_id = 'a0000000-0000-0000-0000-000000000001'),
  (select count(*) from public.documents where organization_id = 'b0000000-0000-0000-0000-000000000002'),
  (
    select count(*)
    from public.match_document_chunks(
      'a0000000-0000-0000-0000-000000000001',
      array_fill(0::real, array[1536])::extensions.vector,
      8
    )
  ),
  (
    select count(*)
    from public.match_document_chunks(
      'b0000000-0000-0000-0000-000000000002',
      array_fill(1::real, array[1536])::extensions.vector,
      8
    )
  ),
  (
    select count(*)
    from storage.objects
    where bucket_id = 'knowledge-documents'
      and name like 'a0000000-0000-0000-0000-000000000001/%'
  ),
  (
    select count(*)
    from storage.objects
    where bucket_id = 'knowledge-documents'
      and name like 'b0000000-0000-0000-0000-000000000002/%'
  ),
  (select count(*) from deleted),
  (
    select count(*)
    from public.automation_runs
    where organization_id = 'b0000000-0000-0000-0000-000000000002'
  ),
  (select count(*) from updated_run_own),
  (select count(*) from updated_run_other);

select throws_ok(
  $$
    insert into public.automation_runs (organization_id, status, input, created_by)
    values (
      'a0000000-0000-0000-0000-000000000001',
      'running',
      '{}',
      '20000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "automation_runs"',
  'tenant A cannot create a run attributed to tenant B user'
);

select throws_ok(
  $$
    update public.conversations
    set organization_id = 'b0000000-0000-0000-0000-000000000002'
    where id = 'a3000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'new row violates row-level security policy for table "conversations"',
  'tenant A cannot move its conversation into tenant B'
);

select lives_ok(
  $$
    select public.set_default_assistant(
      'a0000000-0000-0000-0000-000000000001',
      'a4000000-0000-0000-0000-000000000002'
    )
  $$,
  'tenant A admin can set its default assistant'
);
select is(
  (
    select count(*)
    from public.assistants
    where organization_id = 'a0000000-0000-0000-0000-000000000001'
      and is_default
  ),
  1::bigint,
  'default assistant RPC leaves exactly one tenant A default'
);
select throws_ok(
  $$
    select public.set_default_assistant(
      'b0000000-0000-0000-0000-000000000002',
      'b4000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  'organization_admin_required',
  'tenant A cannot set tenant B default assistant'
);
select lives_ok(
  $$
    select public.delete_assistant(
      'a0000000-0000-0000-0000-000000000001',
      'a4000000-0000-0000-0000-000000000002'
    )
  $$,
  'tenant A admin can atomically delete its default assistant'
);
select is(
  (
    select count(*)
    from public.assistants
    where organization_id = 'a0000000-0000-0000-0000-000000000001'
      and is_default
  ),
  1::bigint,
  'deleting a default promotes exactly one fallback'
);
select is(
  (
    select id
    from public.assistants
    where organization_id = 'a0000000-0000-0000-0000-000000000001'
      and is_default
  ),
  'a4000000-0000-0000-0000-000000000001'::uuid,
  'delete assistant RPC promotes the oldest fallback'
);
select is(
  (
    select count(*)
    from public.assistants
    where id = 'a4000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'delete assistant RPC removes the requested assistant'
);
select throws_ok(
  $$
    select public.delete_assistant(
      'b0000000-0000-0000-0000-000000000002',
      'b4000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  'organization_admin_required',
  'tenant A cannot delete a tenant B assistant'
);
select lives_ok(
  $$
    select public.finalize_chat_completion(
      'a0000000-0000-0000-0000-000000000001',
      'a3000000-0000-0000-0000-000000000001',
      'Resposta persistida atomicamente.',
      'test-model',
      10,
      20,
      '{"finish_reason":"stop"}',
      '{"source":"pgtap"}'
    )
  $$,
  'tenant A finalizes its chat completion atomically'
);
select is(
  (
    select count(*) from public.messages
    where conversation_id = 'a3000000-0000-0000-0000-000000000001'
      and role = 'assistant'
  ),
  1::bigint,
  'chat completion RPC persists one assistant message'
);
select is(
  (
    select count(*) from public.usage_events
    where organization_id = 'a0000000-0000-0000-0000-000000000001'
      and event_type = 'chat.completion'
  ),
  1::bigint,
  'chat completion RPC persists one usage event'
);
select is(
  (
    select updated_at > created_at from public.conversations
    where id = 'a3000000-0000-0000-0000-000000000001'
  ),
  true,
  'chat completion RPC touches conversation activity'
);
select throws_ok(
  $$
    select public.finalize_chat_completion(
      'b0000000-0000-0000-0000-000000000002',
      'a3000000-0000-0000-0000-000000000001',
      'Cross tenant response.',
      'test-model',
      1,
      1,
      '{}',
      '{}'
    )
  $$,
  '42501',
  'organization_member_required',
  'tenant A cannot finalize tenant B chat data'
);
select throws_ok(
  $$
    select public.add_organization_member_by_email(
      'b0000000-0000-0000-0000-000000000002',
      'tenant-a@example.test',
      'member'
    )
  $$,
  '42501',
  'organization_admin_required',
  'tenant A cannot add members to tenant B'
);
select lives_ok(
  $$select public.manage_organization_member(
    'a0000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    'admin',
    'active'
  )$$,
  'tenant A admin can promote its member'
);
select is(
  (select role from public.organization_members where user_id = '30000000-0000-0000-0000-000000000003'),
  'admin'::public.organization_role,
  'member promotion persists'
);
select lives_ok(
  $$select public.manage_organization_member(
    'a0000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    'member',
    'removed'
  )$$,
  'tenant A admin can remove its member'
);
select is(
  (select status from public.organization_members where user_id = '30000000-0000-0000-0000-000000000003'),
  'removed'::public.member_status,
  'member removal persists'
);
select throws_ok(
  $$select public.manage_organization_member(
    'a0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'member',
    'removed'
  )$$,
  '42501',
  'organization_owner_immutable',
  'organization owner cannot be removed'
);
select throws_ok(
  $$select public.manage_organization_member(
    'b0000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'member',
    'removed'
  )$$,
  '42501',
  'organization_admin_required',
  'tenant A cannot manage tenant B members'
);
select lives_ok(
  $$select public.activate_catalog_version(
    'a0000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000011'
  )$$,
  'tenant A activates catalog version one'
);
select is(
  (select catalog_version from public.documents where id = 'a1000000-0000-0000-0000-000000000011'),
  1,
  'first catalog receives version one'
);
select lives_ok(
  $$select public.activate_catalog_version(
    'a0000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000012'
  )$$,
  'tenant A activates catalog version two'
);
select is(
  (select catalog_version from public.documents where id = 'a1000000-0000-0000-0000-000000000012'),
  2,
  'second catalog receives version two'
);
select is(
  (select superseded_at is not null from public.documents where id = 'a1000000-0000-0000-0000-000000000011'),
  true,
  'previous catalog is superseded'
);
select is(
  (select count(*) from public.documents where organization_id = 'a0000000-0000-0000-0000-000000000001' and source_kind = 'catalog' and superseded_at is null),
  1::bigint,
  'tenant keeps exactly one active catalog'
);
select throws_ok(
  $$select public.activate_catalog_version(
    'b0000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000012'
  )$$,
  '42501',
  'organization_admin_required',
  'tenant A cannot activate tenant B catalogs'
);
select lives_ok(
  $$insert into public.messages (organization_id, conversation_id, role, content, request_id)
    values (
      'a0000000-0000-0000-0000-000000000001',
      'a3000000-0000-0000-0000-000000000001',
      'user',
      'Mensagem idempotente',
      '1d3a9000-0000-4000-8000-000000000001'
    )$$,
  'first request id is accepted'
);
select throws_ok(
  $$insert into public.messages (organization_id, conversation_id, role, content, request_id)
    values (
      'a0000000-0000-0000-0000-000000000001',
      'a3000000-0000-0000-0000-000000000001',
      'user',
      'Retry duplicado',
      '1d3a9000-0000-4000-8000-000000000001'
    )$$,
  '23505',
  'duplicate key value violates unique constraint "messages_user_request_id_idx"',
  'duplicate request id is rejected before another completion'
);

reset role;

select lives_ok(
  $$select public.create_support_draft('a0000000-0000-0000-0000-000000000001',(select id from public.support_conversations where organization_id='a0000000-0000-0000-0000-000000000001' limit 1),'Resposta em revisao')$$,
  'tenant A creates a draft in its attendance'
);
select is((select count(*) from public.support_messages where organization_id='a0000000-0000-0000-0000-000000000001' and status='draft'),1::bigint,'draft is persisted without sending');
select lives_ok(
  $$select public.update_support_draft('a0000000-0000-0000-0000-000000000001',(select id from public.support_messages where organization_id='a0000000-0000-0000-0000-000000000001' and status='draft' limit 1),'Resposta editada')$$,
  'tenant A edits its pending draft'
);
select lives_ok(
  $$select public.review_support_draft('a0000000-0000-0000-0000-000000000001',(select id from public.support_messages where organization_id='a0000000-0000-0000-0000-000000000001' and status='draft' limit 1),'approved')$$,
  'tenant A approves its draft'
);
select is((select count(*) from public.support_messages where organization_id='a0000000-0000-0000-0000-000000000001' and status='approved'),1::bigint,'approval does not mark message as sent');
select throws_ok(
  $$select public.update_support_draft('a0000000-0000-0000-0000-000000000001',(select id from public.support_messages where organization_id='a0000000-0000-0000-0000-000000000001' and status='approved' limit 1),'Alteracao tardia')$$,
  'P0002','draft_not_found_or_already_reviewed','approved draft is immutable'
);
select throws_ok(
  $$select public.create_support_draft('b0000000-0000-0000-0000-000000000002',(select id from public.support_conversations where organization_id='a0000000-0000-0000-0000-000000000001' limit 1),'Tentativa cruzada')$$,
  '42501','organization_member_required','tenant A cannot draft for tenant B'
);
select throws_ok(
  $$select public.review_support_draft('b0000000-0000-0000-0000-000000000002',(select id from public.support_messages where organization_id='a0000000-0000-0000-0000-000000000001' limit 1),'approved')$$,
  '42501','organization_member_required','tenant A cannot review tenant B drafts'
);

select is(jsonb_array_length(public.get_support_inbox('a0000000-0000-0000-0000-000000000001')), 1, 'tenant A inbox returns its attendance');
select is(jsonb_array_length(public.get_support_inbox('b0000000-0000-0000-0000-000000000002')), 0, 'tenant A inbox cannot read tenant B attendance');

select is((select member_own from tenant_a_results), true, 'tenant A user is a member of tenant A');
select is((select member_other from tenant_a_results), false, 'tenant A user is not a member of tenant B');
select is((select admin_own from tenant_a_results), true, 'tenant A owner is admin of tenant A');
select is((select admin_other from tenant_a_results), false, 'tenant A owner is not admin of tenant B');
select is((select documents_own from tenant_a_results), 1::bigint, 'tenant A reads its document');
select is((select documents_other from tenant_a_results), 0::bigint, 'tenant A cannot read tenant B document');
select is((select matches_own from tenant_a_results), 1::bigint, 'tenant A vector search returns its chunk');
select is((select matches_other from tenant_a_results), 0::bigint, 'tenant A vector search cannot cross tenants');
select is((select storage_own from tenant_a_results), 1::bigint, 'tenant A reads its storage object');
select is((select storage_other from tenant_a_results), 0::bigint, 'tenant A cannot read tenant B storage object');
select is((select deleted_other from tenant_a_results), 0::bigint, 'tenant A cannot delete tenant B document');
select is((select runs_other from tenant_a_results), 0::bigint, 'tenant A cannot read tenant B automation run');
select is((select updated_run_own from tenant_a_results), 1::bigint, 'tenant A can update its own automation run');
select is((select updated_run_other from tenant_a_results), 0::bigint, 'tenant A cannot update tenant B automation run');

set local request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';
select throws_ok(
  $$select * from public.bootstrap_owned_organization('b0000000-0000-0000-0000-000000000002')$$,
  '42501',
  'organization_not_owned',
  'bootstrap rejects an organization owned by another user'
);

set local request.jwt.claims =
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is(
  public.is_org_member('b0000000-0000-0000-0000-000000000002'),
  true,
  'tenant B user is a member of tenant B'
);
select lives_ok(
  $$select * from public.bootstrap_owned_organization('b0000000-0000-0000-0000-000000000002')$$,
  'bootstrap accepts the organization owner'
);

select * from finish();
rollback;
