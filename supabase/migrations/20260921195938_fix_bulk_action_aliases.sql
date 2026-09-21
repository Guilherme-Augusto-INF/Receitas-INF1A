-- Corrige referências ambíguas detectadas pelos testes transacionais pós-deploy.
create or replace function public.bulk_assign_students(p_user_ids uuid[],p_group_id uuid)
returns integer language plpgsql security definer set search_path=''
as $$ declare affected integer; begin
  perform private.require_teacher();
  if coalesce(array_length(p_user_ids,1),0)<1 or array_length(p_user_ids,1)>100 then raise exception 'Selecione entre 1 e 100 alunos.'; end if;
  if p_group_id is not null and not exists(select 1 from public.groups where id=p_group_id) then raise exception 'Grupo não encontrado.'; end if;
  if exists(select 1 from unnest(p_user_ids) as selected(user_id) left join public.profiles p on p.id=selected.user_id where p.id is null or p.role<>'student' or p.is_anonymous) then raise exception 'A seleção contém conta inválida.'; end if;
  update public.profiles set group_id=p_group_id,updated_at=now() where id=any(p_user_ids) and role='student' and not is_anonymous;
  get diagnostics affected=row_count;
  if affected<>array_length(p_user_ids,1) then raise exception 'A operação não pôde ser aplicada integralmente.'; end if;
  perform private.log_activity('students_bulk_moved',p_group_id,'profiles',null,jsonb_build_object('count',affected,'user_ids',p_user_ids));
  return affected;
end $$;
revoke all on function public.bulk_assign_students(uuid[],uuid) from public,anon;
grant execute on function public.bulk_assign_students(uuid[],uuid) to authenticated;

create or replace function public.bulk_group_action(p_group_ids uuid[],p_action text)
returns integer language plpgsql security definer set search_path=''
as $$ declare affected integer; status_value text; begin
  perform private.require_teacher();
  if coalesce(array_length(p_group_ids,1),0)<1 or array_length(p_group_ids,1)>50 then raise exception 'Selecione entre 1 e 50 grupos.'; end if;
  if exists(select 1 from unnest(p_group_ids) as selected(group_id) left join public.groups g on g.id=selected.group_id where g.id is null) then raise exception 'A seleção contém grupo inválido.'; end if;
  if p_action like 'status:%' then
    status_value=split_part(p_action,':',2); if status_value not in ('not_started','in_progress','review','completed') then raise exception 'Status inválido.'; end if;
    update public.groups set activity_status=status_value,updated_at=now() where id=any(p_group_ids); get diagnostics affected=row_count;
    update public.recipes set is_locked=(status_value='completed'),updated_at=now() where group_id=any(p_group_ids) and deleted_at is null;
  elsif p_action in ('lock','unlock') then
    update public.recipes set is_locked=(p_action='lock'),updated_at=now() where group_id=any(p_group_ids) and deleted_at is null; get diagnostics affected=row_count;
  else raise exception 'Ação em massa inválida.'; end if;
  perform private.log_activity('groups_bulk_action',null,'groups',null,jsonb_build_object('action',p_action,'group_ids',p_group_ids,'affected',affected));
  return affected;
end $$;
revoke all on function public.bulk_group_action(uuid[],text) from public,anon;
grant execute on function public.bulk_group_action(uuid[],text) to authenticated;
