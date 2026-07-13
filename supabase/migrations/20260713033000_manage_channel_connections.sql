create or replace function public.register_channel_connection(
  target_organization_id uuid, connection_kind text,
  connection_name text, connection_phone text
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_id uuid; normalized_phone text;
begin
  if not public.is_org_admin(target_organization_id) then raise exception 'organization_admin_required' using errcode='42501'; end if;
  if connection_kind not in ('official','unofficial') then raise exception 'invalid_channel_kind' using errcode='22023'; end if;
  normalized_phone := regexp_replace(connection_phone, '[^0-9+]', '', 'g');
  if length(normalized_phone) < 10 or length(normalized_phone) > 20 or length(btrim(connection_name)) < 2 then
    raise exception 'invalid_channel_connection' using errcode='22023';
  end if;
  insert into public.channel_connections(organization_id,kind,provider,display_name,phone_number,status)
  values(target_organization_id,connection_kind,'pending-selection',btrim(connection_name),normalized_phone,'pending')
  returning id into new_id;
  return new_id;
end; $$;
revoke all on function public.register_channel_connection(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.register_channel_connection(uuid,text,text,text) to authenticated;

create or replace function public.list_channel_connections(target_organization_id uuid)
returns jsonb language sql security invoker set search_path='' stable as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'provider',provider,'name',display_name,'phoneNumber',phone_number,'status',status) order by created_at), '[]'::jsonb)
 from public.channel_connections where organization_id=target_organization_id and public.is_org_member(target_organization_id);
$$;
revoke all on function public.list_channel_connections(uuid) from public,anon,authenticated;
grant execute on function public.list_channel_connections(uuid) to authenticated;
