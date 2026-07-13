alter table public.channel_connections
  add column if not exists auth_method text not null default 'qr'
    check (auth_method in ('qr', 'pin'));

drop function if exists public.register_channel_connection(uuid, text, text, text);
create function public.register_channel_connection(
  target_organization_id uuid, connection_kind text,
  connection_name text, connection_phone text, connection_auth_method text
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_id uuid; normalized_phone text;
begin
  if not public.is_org_admin(target_organization_id) then raise exception 'organization_admin_required' using errcode='42501'; end if;
  if connection_kind not in ('official','unofficial') or connection_auth_method not in ('qr','pin') then raise exception 'invalid_channel_configuration' using errcode='22023'; end if;
  normalized_phone := regexp_replace(connection_phone, '[^0-9+]', '', 'g');
  if length(normalized_phone) < 10 or length(normalized_phone) > 20 or length(btrim(connection_name)) < 2 then raise exception 'invalid_channel_connection' using errcode='22023'; end if;
  insert into public.channel_connections(organization_id,kind,provider,display_name,phone_number,status,auth_method)
  values(target_organization_id,connection_kind,'pending-selection',btrim(connection_name),normalized_phone,'pending',connection_auth_method)
  returning id into new_id; return new_id;
end; $$;
revoke all on function public.register_channel_connection(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.register_channel_connection(uuid,text,text,text,text) to authenticated;

create or replace function public.update_channel_connection(
  target_organization_id uuid, target_connection_id uuid,
  connection_name text, connection_phone text, connection_auth_method text
) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not public.is_org_admin(target_organization_id) then raise exception 'organization_admin_required' using errcode='42501'; end if;
 if connection_auth_method not in ('qr','pin') then raise exception 'invalid_auth_method' using errcode='22023'; end if;
 update public.channel_connections set display_name=btrim(connection_name),phone_number=regexp_replace(connection_phone,'[^0-9+]','','g'),auth_method=connection_auth_method
 where id=target_connection_id and organization_id=target_organization_id;
 if not found then raise exception 'channel_not_found' using errcode='P0002'; end if;
end; $$;

create or replace function public.delete_channel_connection(target_organization_id uuid,target_connection_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if not public.is_org_admin(target_organization_id) then raise exception 'organization_admin_required' using errcode='42501'; end if;
 delete from public.channel_connections where id=target_connection_id and organization_id=target_organization_id;
 if not found then raise exception 'channel_not_found_or_in_use' using errcode='P0002'; end if;
end; $$;
revoke all on function public.update_channel_connection(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.delete_channel_connection(uuid,uuid) from public,anon,authenticated;
grant execute on function public.update_channel_connection(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.delete_channel_connection(uuid,uuid) to authenticated;

create or replace function public.list_channel_connections(target_organization_id uuid)
returns jsonb language sql security invoker set search_path='' stable as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'provider',provider,'name',display_name,'phoneNumber',phone_number,'status',status,'authMethod',auth_method) order by created_at), '[]'::jsonb)
 from public.channel_connections where organization_id=target_organization_id and public.is_org_member(target_organization_id);
$$;

create or replace function public.get_support_conversation(target_organization_id uuid,target_conversation_id uuid)
returns jsonb language sql security invoker set search_path='' stable as $$
 select jsonb_build_object(
  'id',sc.id,'status',sc.status,'priority',sc.priority,
  'contact',jsonb_build_object('id',c.id,'name',c.name,'phone',c.phone,'email',c.email),
  'channel',jsonb_build_object('id',cc.id,'name',cc.display_name,'phoneNumber',cc.phone_number,'kind',cc.kind),
  'messages',coalesce((select jsonb_agg(jsonb_build_object('id',sm.id,'direction',sm.direction,'content',sm.content,'status',sm.status,'createdAt',sm.created_at) order by sm.created_at) from public.support_messages sm where sm.conversation_id=sc.id and sm.organization_id=sc.organization_id),'[]'::jsonb)
 ) from public.support_conversations sc join public.contacts c on c.id=sc.contact_id join public.channel_connections cc on cc.id=sc.channel_connection_id
 where sc.id=target_conversation_id and sc.organization_id=target_organization_id and public.is_org_member(target_organization_id);
$$;
revoke all on function public.get_support_conversation(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_support_conversation(uuid,uuid) to authenticated;
