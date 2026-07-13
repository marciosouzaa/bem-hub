alter table public.support_messages drop constraint support_messages_status_check;
alter table public.support_messages add constraint support_messages_status_check
  check (status in ('received', 'draft', 'approved', 'rejected', 'sent', 'failed'));

create function public.create_support_draft(target_organization_id uuid, target_conversation_id uuid, draft_content text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_id uuid;
begin
  if not public.is_org_member(target_organization_id) then raise exception 'organization_member_required' using errcode='42501'; end if;
  if length(btrim(draft_content)) < 1 or length(draft_content) > 10000 then raise exception 'invalid_draft_content' using errcode='22023'; end if;
  if not exists (select 1 from public.support_conversations where id=target_conversation_id and organization_id=target_organization_id and status <> 'resolved') then
    raise exception 'support_conversation_not_found_or_resolved' using errcode='P0002';
  end if;
  insert into public.support_messages(organization_id,conversation_id,direction,content,status,sent_by)
  values(target_organization_id,target_conversation_id,'outbound',btrim(draft_content),'draft',auth.uid()) returning id into new_id;
  return new_id;
end; $$;

create function public.review_support_draft(target_organization_id uuid, target_message_id uuid, review_decision text)
returns void language plpgsql security invoker set search_path = '' as $$
declare target_conversation_id uuid;
begin
  if not public.is_org_member(target_organization_id) then raise exception 'organization_member_required' using errcode='42501'; end if;
  if review_decision not in ('approved','rejected','escalated') then raise exception 'invalid_review_decision' using errcode='22023'; end if;
  update public.support_messages set
    status=case when review_decision='escalated' then 'approved' else review_decision end,
    metadata=metadata || jsonb_build_object('reviewedBy',auth.uid(),'reviewedAt',now(),'reviewDecision',review_decision)
  where id=target_message_id and organization_id=target_organization_id and direction='outbound' and status='draft'
  returning conversation_id into target_conversation_id;
  if target_conversation_id is null then raise exception 'draft_not_found_or_already_reviewed' using errcode='P0002'; end if;
  if review_decision='escalated' then
    update public.support_conversations set status='escalated',priority='high' where id=target_conversation_id and organization_id=target_organization_id;
  end if;
end; $$;

revoke all on function public.create_support_draft(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.review_support_draft(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.create_support_draft(uuid,uuid,text) to authenticated;
grant execute on function public.review_support_draft(uuid,uuid,text) to authenticated;
