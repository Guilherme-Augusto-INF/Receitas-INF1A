-- Ajustes finais de consistência encontrados no code review.
create or replace function public.set_classroom_control(p_action text)
returns public.classroom_settings language plpgsql security definer set search_path=''
as $$ declare result public.classroom_settings; begin
  perform private.require_teacher();
  if p_action='lock' then
    update public.classroom_settings set edits_locked=true where id=1 returning * into result;
  elsif p_action='unlock' then
    update public.classroom_settings set edits_locked=false,activity_finalized=false where id=1 returning * into result;
    update public.recipes set is_locked=(review_status='approved'),updated_at=now() where deleted_at is null;
  elsif p_action='finalize' then
    update public.classroom_settings set edits_locked=true,activity_finalized=true where id=1 returning * into result;
    update public.recipes set is_locked=true,updated_at=now() where deleted_at is null;
  else raise exception 'Controle inválido.'; end if;
  perform private.log_activity('classroom_'||p_action,null,'classroom','1','{}'::jsonb);
  return result;
end $$;
revoke all on function public.set_classroom_control(text) from public,anon;
grant execute on function public.set_classroom_control(text) to authenticated;

create or replace function public.set_group_status(target_group_id uuid,new_status text)
returns public.groups language plpgsql security definer set search_path=''
as $$ declare result public.groups; begin
  perform private.require_teacher();
  if new_status not in ('not_started','in_progress','review','completed') then raise exception 'Status inválido.'; end if;
  update public.groups set activity_status=new_status where id=target_group_id returning * into result;
  if result.id is null then raise exception 'Grupo não encontrado.'; end if;
  update public.recipes set is_locked=(new_status='completed' or review_status='approved'),updated_at=now() where group_id=target_group_id and deleted_at is null;
  perform private.log_activity('status_changed',target_group_id,'group',target_group_id::text,jsonb_build_object('status',new_status));
  return result;
end $$;
revoke all on function public.set_group_status(uuid,text) from public,anon;
grant execute on function public.set_group_status(uuid,text) to authenticated;

create or replace function public.bulk_group_action(p_group_ids uuid[],p_action text)
returns integer language plpgsql security definer set search_path=''
as $$ declare affected integer; status_value text; begin
  perform private.require_teacher();
  if coalesce(array_length(p_group_ids,1),0)<1 or array_length(p_group_ids,1)>50 then raise exception 'Selecione entre 1 e 50 grupos.'; end if;
  if exists(select 1 from unnest(p_group_ids) as selected(group_id) left join public.groups g on g.id=selected.group_id where g.id is null) then raise exception 'A seleção contém grupo inválido.'; end if;
  if p_action like 'status:%' then
    status_value=split_part(p_action,':',2); if status_value not in ('not_started','in_progress','review','completed') then raise exception 'Status inválido.'; end if;
    update public.groups set activity_status=status_value,updated_at=now() where id=any(p_group_ids); get diagnostics affected=row_count;
    update public.recipes set is_locked=(status_value='completed' or review_status='approved'),updated_at=now() where group_id=any(p_group_ids) and deleted_at is null;
  elsif p_action in ('lock','unlock') then
    update public.recipes set is_locked=(p_action='lock' or review_status='approved'),updated_at=now() where group_id=any(p_group_ids) and deleted_at is null; get diagnostics affected=row_count;
  else raise exception 'Ação em massa inválida.'; end if;
  perform private.log_activity('groups_bulk_action',null,'groups',null,jsonb_build_object('action',p_action,'group_ids',p_group_ids,'affected',affected));
  return affected;
end $$;
revoke all on function public.bulk_group_action(uuid[],text) from public,anon;
grant execute on function public.bulk_group_action(uuid[],text) to authenticated;

create or replace function public.delete_announcement(p_id uuid)
returns void language plpgsql security definer set search_path=''
as $$ begin
  perform private.require_teacher();
  update public.announcements set deleted_at=now(),updated_by=auth.uid(),updated_at=now(),is_published=false where id=p_id and deleted_at is null;
  if not found then raise exception 'Aviso não encontrado.'; end if;
  update public.classroom_settings set announcement=(select message from public.announcements where deleted_at is null and is_published and (expires_at is null or expires_at>now()) order by is_featured desc,updated_at desc limit 1),announcement_updated_at=now(),updated_by=auth.uid() where id=1;
  perform private.log_activity('announcement_deleted',null,'announcement',p_id::text,'{}'::jsonb);
end $$;
revoke all on function public.delete_announcement(uuid) from public,anon;
grant execute on function public.delete_announcement(uuid) to authenticated;
