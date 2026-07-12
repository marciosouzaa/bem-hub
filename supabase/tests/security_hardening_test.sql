begin;
select plan(29);

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
  ('20000000-0000-0000-0000-000000000002', 'tenant-b@example.test');

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
  deleted_other bigint
) on commit drop;
grant insert, select on tenant_a_results to authenticated;

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';

with deleted as (
  delete from public.documents
  where id = 'b1000000-0000-0000-0000-000000000002'
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
  (select count(*) from deleted);

reset role;

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
