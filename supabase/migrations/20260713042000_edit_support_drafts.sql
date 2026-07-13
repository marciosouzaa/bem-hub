create function public.update_support_draft(
  target_organization_id uuid, target_message_id uuid, draft_content text
) returns void language plpgsql security invoker set search_path='' as $$
begin
  if not public.is_org_member(target_organization_id) then raise exception 'organization_member_required' using errcode='42501'; end if;
  if length(btrim(draft_content)) < 1 or length(draft_content) > 10000 then raise exception 'invalid_draft_content' using errcode='22023'; end if;
  update public.support_messages set content=btrim(draft_content),metadata=metadata || jsonb_build_object('editedBy',auth.uid(),'editedAt',now())
  where id=target_message_id and organization_id=target_organization_id and direction='outbound' and status='draft';
  if not found then raise exception 'draft_not_found_or_already_reviewed' using errcode='P0002'; end if;
end; $$;
revoke all on function public.update_support_draft(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.update_support_draft(uuid,uuid,text) to authenticated;
