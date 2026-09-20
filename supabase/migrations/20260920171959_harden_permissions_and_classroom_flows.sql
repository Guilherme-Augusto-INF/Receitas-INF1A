-- V3: corrige regressões de perfil/status e endurece os fluxos privilegiados.
-- Esta migration foi escrita contra o schema real de produção em 2026-09-20.

-- Perfis são alterados apenas por RPCs com campos explicitamente permitidos.
revoke update on table public.profiles from anon, authenticated;

drop function if exists public.update_my_profile_name(text);
drop function if exists public.update_my_profile_call_number(integer);
drop function if exists public.update_my_profile(text, integer);

create or replace function public.update_my_profile(new_name text, new_call_number integer)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result public.profiles;
  anonymous_user boolean;
begin
  if uid is null then
    raise exception 'Faça login para atualizar o perfil.';
  end if;

  select p.is_anonymous into anonymous_user
  from public.profiles p
  where p.id = uid;

  if not found then
    raise exception 'Perfil não encontrado.';
  end if;
  if anonymous_user or coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception 'Contas anônimas não podem alterar dados de perfil.';
  end if;
  if nullif(btrim(new_name), '') is null or length(btrim(new_name)) > 120 then
    raise exception 'O nome deve ter entre 1 e 120 caracteres.';
  end if;
  if new_call_number is not null and (new_call_number < 1 or new_call_number > 999) then
    raise exception 'O número da chamada deve estar entre 1 e 999.';
  end if;

  update public.profiles
  set full_name = btrim(new_name),
      call_number = new_call_number,
      updated_at = now()
  where id = uid
  returning * into result;

  return result;
end;
$$;
revoke all on function public.update_my_profile(text, integer) from public, anon;
grant execute on function public.update_my_profile(text, integer) to authenticated;

create or replace function public.manage_profile_classroom(
  target_user_id uuid,
  new_group_id uuid,
  new_call_number integer
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null
     or coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false)
     or not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'teacher' and not p.is_anonymous
     ) then
    raise exception 'Apenas professores podem organizar usuários.';
  end if;
  if new_group_id is not null
     and not exists (select 1 from public.groups g where g.id = new_group_id) then
    raise exception 'Grupo não encontrado.';
  end if;
  if new_call_number is not null and (new_call_number < 1 or new_call_number > 999) then
    raise exception 'O número da chamada deve estar entre 1 e 999.';
  end if;

  update public.profiles
  set group_id = new_group_id,
      call_number = new_call_number,
      updated_at = now()
  where id = target_user_id and not is_anonymous
  returning * into result;

  if result.id is null then
    raise exception 'Usuário cadastrado não encontrado.';
  end if;
  return result;
end;
$$;
revoke all on function public.manage_profile_classroom(uuid, uuid, integer) from public, anon;
grant execute on function public.manage_profile_classroom(uuid, uuid, integer) to authenticated;

create or replace function public.set_user_role_classroom(target_user_id uuid, new_role text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null
     or coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false)
     or not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'teacher' and not p.is_anonymous
     ) then
    raise exception 'Apenas professores podem alterar funções.';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'O professor não pode alterar a própria função por este painel.';
  end if;
  if new_role not in ('student', 'teacher') then
    raise exception 'Função inválida.';
  end if;

  update public.profiles
  set role = new_role, updated_at = now()
  where id = target_user_id and not is_anonymous
  returning * into result;

  if result.id is null then
    raise exception 'Usuário cadastrado não encontrado.';
  end if;
  return result;
end;
$$;
revoke all on function public.set_user_role_classroom(uuid, text) from public, anon;
grant execute on function public.set_user_role_classroom(uuid, text) to authenticated;

-- A home só recebe agregados; nomes e números continuam protegidos pela RLS.
create or replace function public.get_group_overview()
returns table(
  group_id uuid,
  name text,
  slug text,
  description text,
  activity_status text,
  photo_url text,
  member_count bigint,
  recipe_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name, g.slug, g.description, g.activity_status, g.photo_url,
    (select count(*) from public.profiles p
      where p.group_id = g.id and p.role = 'student' and not p.is_anonymous),
    (select count(*) from public.recipes r where r.group_id = g.id)
  from public.groups g
  order by g.slug;
$$;
revoke all on function public.get_group_overview() from public;
grant execute on function public.get_group_overview() to anon, authenticated;

create or replace function public.get_group_members(target_group_id uuid)
returns table(full_name text, call_number integer, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.full_name, p.call_number, p.role
  from public.profiles p
  where p.group_id = target_group_id
    and p.role = 'student'
    and not p.is_anonymous
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid()
        and not viewer.is_anonymous
        and (viewer.role = 'teacher' or viewer.group_id = target_group_id)
    )
  order by p.call_number nulls last, p.full_name;
$$;
revoke all on function public.get_group_members(uuid) from public, anon;
grant execute on function public.get_group_members(uuid) to authenticated;

-- A finalização passa a ser imposta em toda escrita, inclusive RPC direta.
create or replace function public.save_recipe_classroom(
  target_recipe_id uuid,
  new_title text,
  new_ingredients text,
  new_instructions text,
  new_notes text
)
returns public.recipes
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result public.recipes;
  user_role text;
  user_group uuid;
  anonymous_user boolean;
  group_status text;
begin
  if uid is null or coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception 'Faça login com uma conta cadastrada para editar receitas.';
  end if;

  select p.role, p.group_id, p.is_anonymous
  into user_role, user_group, anonymous_user
  from public.profiles p where p.id = uid;

  if not found or anonymous_user then
    raise exception 'Perfil sem permissão para editar receitas.';
  end if;

  select r.* into result
  from public.recipes r
  where r.id = target_recipe_id;

  if result.id is null then
    raise exception 'Receita não encontrada.';
  end if;
  select g.activity_status into group_status
  from public.groups g where g.id = result.group_id;
  if user_role <> 'teacher' and user_group is distinct from result.group_id then
    raise exception 'Você não pertence a este grupo.';
  end if;
  if user_role <> 'teacher' and (result.is_locked or group_status = 'completed') then
    raise exception 'Esta atividade está finalizada e bloqueada.';
  end if;
  if nullif(btrim(new_title), '') is null or length(btrim(new_title)) > 160 then
    raise exception 'O título deve ter entre 1 e 160 caracteres.';
  end if;
  if nullif(btrim(new_ingredients), '') is null or length(new_ingredients) > 20000 then
    raise exception 'Os ingredientes devem ter entre 1 e 20000 caracteres.';
  end if;
  if nullif(btrim(new_instructions), '') is null or length(new_instructions) > 20000 then
    raise exception 'O preparo deve ter entre 1 e 20000 caracteres.';
  end if;
  if new_notes is not null and length(new_notes) > 5000 then
    raise exception 'As observações devem ter no máximo 5000 caracteres.';
  end if;

  update public.recipes
  set title = btrim(new_title),
      ingredients = btrim(new_ingredients),
      instructions = btrim(new_instructions),
      notes = nullif(btrim(new_notes), ''),
      updated_by = uid,
      updated_at = now()
  where id = target_recipe_id
  returning * into result;

  return result;
end;
$$;
revoke all on function public.save_recipe_classroom(uuid, text, text, text, text) from public, anon;
grant execute on function public.save_recipe_classroom(uuid, text, text, text, text) to authenticated;

create or replace function public.guard_recipe_classroom()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_role text;
  user_group uuid;
  anonymous_user boolean;
  group_status text;
begin
  select p.role, p.group_id, p.is_anonymous
  into user_role, user_group, anonymous_user
  from public.profiles p where p.id = auth.uid();

  if user_role = 'teacher' and not anonymous_user
     and not coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false) then
    return coalesce(new, old);
  end if;

  if user_role is distinct from 'student'
     or anonymous_user
     or coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false) then
    raise exception 'Conta sem permissão para alterar receitas.';
  end if;

  select g.activity_status into group_status
  from public.groups g where g.id = coalesce(new.group_id, old.group_id);

  if user_group is distinct from coalesce(new.group_id, old.group_id) then
    raise exception 'Você não pertence a este grupo.';
  end if;
  if group_status = 'completed' then
    raise exception 'A atividade deste grupo já foi finalizada.';
  end if;
  if tg_op = 'INSERT' and new.is_locked then
    raise exception 'Apenas o professor pode bloquear receitas.';
  end if;
  if tg_op = 'UPDATE' and (
    old.is_locked
    or new.is_locked is distinct from old.is_locked
    or new.group_id is distinct from old.group_id
  ) then
    raise exception 'Esta alteração é exclusiva do professor.';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Apenas o professor pode excluir receitas.';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function public.guard_recipe_classroom() from public, anon, authenticated;

create or replace function public.set_group_status(target_group_id uuid, new_status text)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.groups;
begin
  if auth.uid() is null
     or coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false)
     or not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'teacher' and not p.is_anonymous
     ) then
    raise exception 'Apenas professores podem alterar o status.';
  end if;
  if new_status not in ('not_started', 'in_progress', 'review', 'completed') then
    raise exception 'Status inválido.';
  end if;

  update public.groups set activity_status = new_status
  where id = target_group_id returning * into result;
  if result.id is null then raise exception 'Grupo não encontrado.'; end if;

  update public.recipes
  set is_locked = (new_status = 'completed'), updated_at = now()
  where group_id = target_group_id;

  insert into public.activity_history(group_id, actor_id, action, details)
  values (target_group_id, auth.uid(), 'status_changed', jsonb_build_object('status', new_status));
  return result;
end;
$$;
revoke all on function public.set_group_status(uuid, text) from public, anon;
grant execute on function public.set_group_status(uuid, text) to authenticated;

create or replace function public.set_announcement(new_announcement text)
returns public.classroom_settings
language plpgsql
security definer
set search_path = ''
as $$
declare result public.classroom_settings;
begin
  if auth.uid() is null
     or coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false)
     or not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'teacher' and not p.is_anonymous
     ) then
    raise exception 'Apenas professores podem publicar avisos.';
  end if;
  if new_announcement is not null and length(btrim(new_announcement)) > 1000 then
    raise exception 'O aviso deve ter no máximo 1000 caracteres.';
  end if;
  update public.classroom_settings
  set announcement = nullif(btrim(new_announcement), ''),
      announcement_updated_at = now(), updated_by = auth.uid()
  where id = 1 returning * into result;
  insert into public.activity_history(actor_id, action, details)
  values (auth.uid(), 'announcement_changed', jsonb_build_object('has_announcement', result.announcement is not null));
  return result;
end;
$$;
revoke all on function public.set_announcement(text) from public, anon;
grant execute on function public.set_announcement(text) to authenticated;

create or replace function public.set_group_photo(target_group_id uuid, new_photo_url text)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare result public.groups;
begin
  if auth.uid() is null
     or coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false)
     or not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'teacher' and not p.is_anonymous
     ) then
    raise exception 'Apenas professores podem atualizar a foto.';
  end if;
  if nullif(btrim(new_photo_url), '') is not null and new_photo_url !~
    '^https://fbniifpkiyafpuhpnbll[.]supabase[.]co/storage/v1/object/public/activity-photos/' then
    raise exception 'URL de foto inválida.';
  end if;
  update public.groups set photo_url = nullif(btrim(new_photo_url), '')
  where id = target_group_id returning * into result;
  if result.id is null then raise exception 'Grupo não encontrado.'; end if;
  insert into public.activity_history(group_id, actor_id, action, details)
  values (target_group_id, auth.uid(), 'photo_changed', jsonb_build_object('has_photo', result.photo_url is not null));
  return result;
end;
$$;
revoke all on function public.set_group_photo(uuid, text) from public, anon;
grant execute on function public.set_group_photo(uuid, text) to authenticated;

create or replace function public.set_recipe_lock(target_recipe_id uuid, new_locked boolean)
returns public.recipes
language plpgsql
security definer
set search_path = ''
as $$
declare result public.recipes;
begin
  if auth.uid() is null
     or coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false)
     or not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'teacher' and not p.is_anonymous
     ) then
    raise exception 'Apenas professores podem bloquear receitas.';
  end if;
  update public.recipes set is_locked = new_locked, updated_at = now()
  where id = target_recipe_id returning * into result;
  if result.id is null then raise exception 'Receita não encontrada.'; end if;
  insert into public.activity_history(group_id, actor_id, action, details)
  values (result.group_id, auth.uid(), case when new_locked then 'recipe_locked' else 'recipe_unlocked' end,
          jsonb_build_object('recipe_id', result.id));
  return result;
end;
$$;
revoke all on function public.set_recipe_lock(uuid, boolean) from public, anon;
grant execute on function public.set_recipe_lock(uuid, boolean) to authenticated;

create or replace function public.delete_student_account(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare target_role text;
begin
  if auth.uid() is null
     or coalesce(((auth.jwt() ->> 'is_anonymous')::boolean), false)
     or not exists (
       select 1 from public.profiles p
       where p.id = auth.uid() and p.role = 'teacher' and not p.is_anonymous
     ) then
    raise exception 'Apenas professores podem excluir contas.';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'O professor não pode excluir a própria conta por este painel.';
  end if;
  select p.role into target_role from public.profiles p where p.id = target_user_id;
  if target_role is null then raise exception 'Usuário não encontrado.'; end if;
  if target_role <> 'student' then raise exception 'Somente contas de alunos podem ser excluídas.'; end if;

  update public.recipes set updated_by = null where updated_by = target_user_id;
  delete from public.profiles where id = target_user_id;
  delete from auth.users where id = target_user_id;
end;
$$;
revoke all on function public.delete_student_account(uuid) from public, anon;
grant execute on function public.delete_student_account(uuid) to authenticated;

-- Limites de integridade independentes do frontend.
alter table public.profiles drop constraint if exists profiles_name_length_chk;
alter table public.profiles add constraint profiles_name_length_chk
  check (full_name is null or length(btrim(full_name)) between 1 and 120);
alter table public.recipes drop constraint if exists recipes_ingredients_length_chk;
alter table public.recipes add constraint recipes_ingredients_length_chk
  check (length(ingredients) <= 20000);
alter table public.recipes drop constraint if exists recipes_instructions_length_chk;
alter table public.recipes add constraint recipes_instructions_length_chk
  check (length(instructions) <= 20000);
alter table public.recipes drop constraint if exists recipes_notes_length_chk;
alter table public.recipes add constraint recipes_notes_length_chk
  check (notes is null or length(notes) <= 5000);

-- O Storage aceita somente imagens raster e no máximo 5 MiB.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'activity-photos';

drop policy if exists activity_photos_teacher_insert on storage.objects;
create policy activity_photos_teacher_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'activity-photos'
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
  and (select private.is_teacher())
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);
drop policy if exists activity_photos_teacher_update on storage.objects;
create policy activity_photos_teacher_update on storage.objects for update to authenticated
using (
  bucket_id = 'activity-photos'
  and (select private.is_teacher())
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
)
with check (
  bucket_id = 'activity-photos'
  and storage.extension(name) in ('jpg', 'jpeg', 'png', 'webp')
  and (select private.is_teacher())
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

-- Funções de trigger nunca são endpoints RPC.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.log_recipe_activity() from public, anon, authenticated;
revoke all on function public.set_recipe_audit_fields() from public, anon, authenticated;
revoke all on function public.set_recipe_updated_by() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
