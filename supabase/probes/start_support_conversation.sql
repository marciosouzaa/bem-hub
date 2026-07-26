\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email)
values
  ('91000000-0000-0000-0000-000000000001', 'start-a@example.test'),
  ('92000000-0000-0000-0000-000000000002', 'start-b@example.test');

insert into public.organizations (id, name, slug, owner_id)
values
  (
    '9a000000-0000-0000-0000-000000000001',
    'Start A',
    'start-a-probe',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '9b000000-0000-0000-0000-000000000002',
    'Start B',
    'start-b-probe',
    '92000000-0000-0000-0000-000000000002'
  );

insert into public.organization_members (organization_id, user_id, role, status)
values
  (
    '9a000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    'owner',
    'active'
  ),
  (
    '9b000000-0000-0000-0000-000000000002',
    '92000000-0000-0000-0000-000000000002',
    'owner',
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
)
values
  (
    '9e000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000001',
    'unofficial',
    'evolution',
    'Evolution probe',
    '+553100000001',
    'connected'
  ),
  (
    '9f000000-0000-0000-0000-000000000001',
    '9a000000-0000-0000-0000-000000000001',
    'unofficial',
    'wuzapi',
    'Wuzapi probe',
    '+553100000002',
    'connected'
  );

insert into public.channel_credentials (
  organization_id,
  channel_connection_id,
  provider,
  encrypted_credentials,
  created_by
)
values
  (
    '9a000000-0000-0000-0000-000000000001',
    '9e000000-0000-0000-0000-000000000001',
    'evolution',
    'probe-evolution',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '9a000000-0000-0000-0000-000000000001',
    '9f000000-0000-0000-0000-000000000001',
    'wuzapi',
    'probe-wuzapi',
    '91000000-0000-0000-0000-000000000001'
  );

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}';

select public.start_support_conversation(
  '9a000000-0000-0000-0000-000000000001',
  '9e000000-0000-0000-0000-000000000001',
  '+55 31 99876-5432',
  'Contato probe',
  'Primeira mensagem Evolution',
  '90100000-0000-4000-8000-000000000001'
);

select public.start_support_conversation(
  '9a000000-0000-0000-0000-000000000001',
  '9f000000-0000-0000-0000-000000000001',
  '+55 31 99876-5432',
  'Nome não sobrescrito',
  'Primeira mensagem Wuzapi',
  '90100000-0000-4000-8000-000000000002'
);

select public.start_support_conversation(
  '9a000000-0000-0000-0000-000000000001',
  '9e000000-0000-0000-0000-000000000001',
  '+55 31 99876-5432',
  'Contato probe',
  'Primeira mensagem Evolution',
  '90100000-0000-4000-8000-000000000001'
);

reset role;

do $probe$
declare
  target_contact_id uuid;
begin
  select id
  into target_contact_id
  from public.contacts
  where organization_id = '9a000000-0000-0000-0000-000000000001'
    and phone_match_key = 'br:5531998765432';

  if target_contact_id is null then
    raise exception 'probe_contact_not_created';
  end if;
  if (
    select count(*)
    from public.support_conversations
    where organization_id = '9a000000-0000-0000-0000-000000000001'
      and contact_id = target_contact_id
      and assigned_to = '91000000-0000-0000-0000-000000000001'
  ) <> 2 then
    raise exception 'probe_provider_conversations_invalid';
  end if;
  if (
    select count(*)
    from public.support_messages
    where organization_id = '9a000000-0000-0000-0000-000000000001'
      and client_request_id in (
        '90100000-0000-4000-8000-000000000001',
        '90100000-0000-4000-8000-000000000002'
      )
  ) <> 2 then
    raise exception 'probe_messages_not_idempotent';
  end if;
  if (
    select count(*)
    from public.support_message_send_attempts
    where organization_id = '9a000000-0000-0000-0000-000000000001'
      and request_id in (
        '90100000-0000-4000-8000-000000000001',
        '90100000-0000-4000-8000-000000000002'
      )
  ) <> 2 then
    raise exception 'probe_attempts_not_idempotent';
  end if;
end;
$probe$;

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}';

do $tenant_probe$
begin
  begin
    perform public.start_support_conversation(
      '9b000000-0000-0000-0000-000000000002',
      '9e000000-0000-0000-0000-000000000001',
      '+55 31 99765-4321',
      '',
      'Tentativa cruzada',
      '90200000-0000-4000-8000-000000000001'
    );
    raise exception 'probe_cross_tenant_allowed';
  exception
    when sqlstate '42501' then null;
  end;
end;
$tenant_probe$;

reset role;
rollback;

select 'start_support_conversation_probe_passed' as result;
