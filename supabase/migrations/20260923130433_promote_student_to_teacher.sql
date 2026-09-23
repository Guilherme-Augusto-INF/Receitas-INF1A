-- Permite que um professor autorizado promova uma conta de aluno para professor.
-- A autorização é validada no backend; alunos/anônimos não podem executar a elevação.

create or replace function public.promote_student_to_teacher(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path=''
as $$
declare
  result public.profiles;
  previous_group_id uuid;
begin
  perform private.require_teacher();

  select p.group_id
    into previous_group_id
  from public.profiles p
  where p.id = p_user_id
    and p.role = 'student'
    and not p.is_anonymous
  for update;

  if not found then
    if exists (
      select 1
      from public.profiles p
      where p.id = p_user_id
        and p.role = 'teacher'
        and not p.is_anonymous
    ) then
      raise exception 'Esta conta já é de professor.';
    end if;
    raise exception 'Aluno não encontrado.';
  end if;

  update public.profiles
  set role = 'teacher',
      group_id = null,
      updated_at = now()
  where id = p_user_id
    and role = 'student'
    and not is_anonymous
  returning * into result;

  if result.id is null then
    raise exception 'Não foi possível promover este aluno.';
  end if;

  perform private.log_activity(
    'student_promoted_to_teacher',
    previous_group_id,
    'profile',
    result.id::text,
    jsonb_build_object(
      'name', result.full_name,
      'previous_group_id', previous_group_id
    )
  );

  return result;
end
$$;

revoke all on function public.promote_student_to_teacher(uuid) from public, anon;
grant execute on function public.promote_student_to_teacher(uuid) to authenticated;
