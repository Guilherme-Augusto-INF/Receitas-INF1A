create or replace function public.delete_student_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  requester_role text;
  target_role text;
begin
  select p.role into requester_role from public.profiles p where p.id = auth.uid();
  if requester_role is distinct from 'teacher' then raise exception 'Apenas professores podem excluir contas.'; end if;
  if target_user_id = auth.uid() then raise exception 'O professor não pode excluir a própria conta por este painel.'; end if;
  select p.role into target_role from public.profiles p where p.id = target_user_id;
  if target_role is null then raise exception 'Usuário não encontrado.'; end if;
  if target_role <> 'student' then raise exception 'Somente contas de alunos podem ser excluídas.'; end if;
  update public.recipes set updated_by = null where updated_by = target_user_id;
  delete from public.profiles where id = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;
revoke all on function public.delete_student_account(uuid) from public;
grant execute on function public.delete_student_account(uuid) to authenticated;
